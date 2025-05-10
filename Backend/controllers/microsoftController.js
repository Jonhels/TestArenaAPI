const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");
const MicrosoftToken = require("../models/microsoftToken");
const { SessionExpiredError } = require("../utils/errors");
const CreateError = require("../utils/createError");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  getOutlookCalendar,
  createOutlookEvent,
  deleteOutlookEvent,
  getMicrosoftUserInfo,
} = require("../utils/outlookUtil");

// Valider nødvendige miljøvariabler
const {
  MICROSOFT_CLIENT_ID: clientId,
  MICROSOFT_CLIENT_SECRET: clientSecret,
  MICROSOFT_REDIRECT_URI: redirectUri,
  MICROSOFT_TENANT_ID: tenant,
  MICROSOFT_SCOPES: scopes,
} = process.env;

const requiredEnvVars = [clientId, clientSecret, redirectUri, tenant, scopes];
if (requiredEnvVars.some((v) => !v)) {
  throw new Error(
    "Microsoft OAuth environment variables not fully configured."
  );
}

// Login URL generator
const loginToMicrosoft = (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const authorizeUrl =
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`;

  res.redirect(authorizeUrl);
};

// Callback from Microsoft OAuth2
const handleMicrosoftCallback = async (req, res, next) => {
  const { code, state } = req.query;

  if (!state || state !== req.session?.oauthState) {
    return next(new CreateError("Invalid state parameter", 400));
  }

  delete req.session.oauthState;

  if (!code) {
    return next(new CreateError("Authorization code not provided", 400));
  }

  try {
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      querystring.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    const userInfo = await getMicrosoftUserInfo(access_token);
    const email = userInfo.mail || userInfo.userPrincipalName;

    await MicrosoftToken.findOneAndUpdate(
      { userEmail: email },
      {
        accessToken: access_token,
        refreshToken: refresh_token,
        name: userInfo.displayName,
        microsoftId: userInfo.id,
      },
      { upsert: true, new: true }
    );

    req.session.microsoft = {
      email,
      name: userInfo.displayName,
      microsoftId: userInfo.id,
    };

    res.send(
      `Authentication successful! Welcome ${userInfo.displayName} (${email})`
    );
  } catch (error) {
    console.error(
      "Microsoft login error:",
      error.response?.data || error.message
    );
    return errorResponse(res, "Authentication with Microsoft failed", 500);
  }
};

// Log out
const logoutMicrosoft = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return errorResponse(res, "Logout failed", 500);
      }
      res.clearCookie("connect.sid");
      return successResponse(res, {}, "Logged out from Microsoft session");
    });
  } else {
    return successResponse(res, {}, "No session found, already logged out");
  }
};

// Token refresh
const refreshAccessToken = async (refreshToken, email) => {
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    querystring.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, refresh_token: newRefreshToken } = response.data;

  const updateData = { accessToken: access_token };
  if (newRefreshToken) updateData.refreshToken = newRefreshToken;

  await MicrosoftToken.findOneAndUpdate({ userEmail: email }, updateData);
  console.log("Refreshed Access Token for", email);

  return access_token;
};

// Try again on 401
const withAutoRefresh = async (userEmail, action) => {
  const tokenDoc = await MicrosoftToken.findOne({ userEmail });
  if (!tokenDoc)
    throw new CreateError("No Microsoft tokens found for user", 404);

  try {
    return await action(tokenDoc.accessToken);
  } catch (error) {
    if (error.response?.status === 401) {
      console.warn("Token expired, refreshing...");
      try {
        const newAccessToken = await refreshAccessToken(
          tokenDoc.refreshToken,
          userEmail
        );
        return await action(newAccessToken);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new SessionExpiredError();
      }
    }
    throw error;
  }
};

// Get calendar events
const getCalendarEvents = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const events = await withAutoRefresh(microsoft.email, getOutlookCalendar);
    return successResponse(res, { events, user: microsoft });
  } catch (error) {
    handleSessionError(error, req, res, "Failed to fetch Outlook calendar");
  }
};

// Create calendar event
const createCalendarEvent = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const { title, description, startTime, endTime, location } = req.body;

    if (!title || !startTime || !endTime) {
      return errorResponse(res, "Missing required fields", 400);
    }

    const eventData = {
      subject: title,
      body: { contentType: "HTML", content: description || "" },
      start: { dateTime: startTime, timeZone: "Europe/Oslo" },
      end: { dateTime: endTime, timeZone: "Europe/Oslo" },
      location: { displayName: location || "" },
    };

    const createdEvent = await withAutoRefresh(microsoft.email, (token) =>
      createOutlookEvent(token, eventData)
    );

    return successResponse(res, { event: createdEvent }, "Event created", 201);
  } catch (error) {
    handleSessionError(error, req, res, "Failed to create Outlook event");
  }
};

// Delete calendar event
const deleteCalendarEvent = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const { eventId } = req.params;

    await withAutoRefresh(microsoft.email, (token) =>
      deleteOutlookEvent(token, eventId)
    );

    return successResponse(res, {}, "Event deleted");
  } catch (error) {
    handleSessionError(error, req, res, "Failed to delete Outlook event");
  }
};

// Helper function for session error handling
const handleSessionError = (error, req, res, defaultMsg) => {
  if (error instanceof SessionExpiredError) {
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return errorResponse(res, error.message, 401);
      });
    } else {
      return errorResponse(res, error.message, 401);
    }
  } else {
    console.error(defaultMsg, error.response?.data || error.message);
    return errorResponse(res, defaultMsg, 500);
  }
};

// Auth status
const getMicrosoftAuthStatus = (req, res) => {
  const isAuthenticated = Boolean(req.session?.microsoft);
  return successResponse(res, {
    authenticated: isAuthenticated,
    user: req.session?.microsoft || null,
  });
};

module.exports = {
  loginToMicrosoft,
  handleMicrosoftCallback,
  logoutMicrosoft,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getMicrosoftAuthStatus,
};
