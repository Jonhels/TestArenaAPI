const MicrosoftToken = require("../models/microsoftToken");
const {
  getOutlookCalendar,
  createOutlookEvent,
  deleteOutlookEvent,
  getMicrosoftUserInfo,
} = require("../utils/outlookUtil");

const axios = require("axios");
const querystring = require("querystring");

const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
const tenant = process.env.MICROSOFT_TENANT_ID;
if (!process.env.MICROSOFT_SCOPES) {
  throw new Error("MICROSOFT_SCOPES is not set in environment variables.");
}

// Send bruker til Microsoft login
const loginToMicrosoft = (req, res) => {
  const scopes = process.env.MICROSOFT_SCOPES;

  const state = crypto.randomBytes(16).toString("hex"); // 32-tegn random string
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

// Microsoft callback (exchange code for tokens)
const handleMicrosoftCallback = async (req, res) => {
  const { code, state } = req.query;

  // Sjekk state
  if (!state || state !== req.session.oauthState) {
    return res.status(400).json({ error: "Invalid state parameter." });
  }

  // Sjekk code
  if (!code) {
    return res.status(400).json({ error: "No code provided from Microsoft." });
  }

  try {
    // Fortsett som før (hente tokens osv.)
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
    res.status(500).send("Authentication failed.");
  }
};

// Logg ut
const logoutMicrosoft = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.send("Logged out successfully!");
  });
};

// Refresh Access Token
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

  const { access_token } = response.data;

  await MicrosoftToken.findOneAndUpdate(
    { userEmail: email },
    { accessToken: access_token }
  );

  console.log("Refreshed Access Token for", email);
  return access_token;
};

// Automatisk håndtering av 401-feil
const withAutoRefresh = async (req, res, userEmail, action) => {
  const tokenDoc = await MicrosoftToken.findOne({ userEmail });
  if (!tokenDoc) throw new Error("No tokens found for user.");

  try {
    return await action(tokenDoc.accessToken);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("Access token expired. Refreshing...");
      try {
        const newAccessToken = await refreshAccessToken(
          tokenDoc.refreshToken,
          userEmail
        );
        return await action(newAccessToken);
      } catch (refreshError) {
        console.error("Failed to refresh token. Destroying session.");
        req.session.destroy(() => {
          res.clearCookie("connect.sid");
          res
            .status(401)
            .json({ error: "Session expired. Please login again." });
        });
        throw new Error("Session expired.");
      }
    }
    throw error;
  }
};

// Hente Outlook-kalender
const getCalendarEvents = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const events = await withAutoRefresh(
      req,
      res,
      microsoft.email,
      getOutlookCalendar
    );

    res.status(200).json({ status: "success", events, user: microsoft });
  } catch (error) {
    console.error(
      "Failed to fetch Outlook calendar:",
      error.response?.data || error.message
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to fetch Outlook calendar." });
    }
  }
};

// Opprette Outlook-kalenderhendelse
const createCalendarEvent = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const { title, description, startTime, endTime, location } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const eventData = {
      subject: title,
      body: { contentType: "HTML", content: description || "" },
      start: { dateTime: startTime, timeZone: "Europe/Oslo" },
      end: { dateTime: endTime, timeZone: "Europe/Oslo" },
      location: { displayName: location || "" },
    };

    const newEvent = await withAutoRefresh(req, res, microsoft.email, (token) =>
      createOutlookEvent(token, eventData)
    );

    res.status(201).json({ status: "success", event: newEvent });
  } catch (error) {
    console.error(
      "Failed to create Outlook event:",
      error.response?.data || error.message
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create event." });
    }
  }
};

// Slette Outlook-kalenderhendelse
const deleteCalendarEvent = async (req, res) => {
  try {
    const { microsoft } = req.session;
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ error: "Missing eventId." });
    }

    await withAutoRefresh(req, res, microsoft.email, (token) =>
      deleteOutlookEvent(token, eventId)
    );

    res
      .status(200)
      .json({ status: "success", message: "Event deleted successfully." });
  } catch (error) {
    console.error(
      "Failed to delete Outlook event:",
      error.response?.data || error.message
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to delete event." });
    }
  }
};

// Sjekk login-status (for frontend)
const getMicrosoftAuthStatus = (req, res) => {
  if (req.session && req.session.microsoft) {
    return res.status(200).json({
      authenticated: true,
      user: req.session.microsoft,
    });
  } else {
    return res.status(200).json({
      authenticated: false,
      user: null,
    });
  }
};

module.exports = {
  loginToMicrosoft,
  logoutMicrosoft,
  handleMicrosoftCallback,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getMicrosoftAuthStatus,
};
