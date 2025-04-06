const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

const getAuthenticatedClient = (accessToken) => {
  if (!accessToken) throw new Error("No access token provided.");

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

const getOutlookCalendar = async (accessToken) => {
  const client = getAuthenticatedClient(accessToken);
  const events = await client.api("/me/events").get();
  return events.value.map((event) => ({
    id: event.id,
    title: event.subject,
    description: event.bodyPreview,
    startTime: event.start.dateTime,
    endTime: event.end.dateTime,
    location: event.location.displayName,
  }));
};

const createOutlookEvent = async (accessToken, eventData) => {
  const client = getAuthenticatedClient(accessToken);
  const event = await client.api("/me/events").post(eventData);
  return event;
};

const deleteOutlookEvent = async (accessToken, eventId) => {
  const client = getAuthenticatedClient(accessToken);
  await client.api(`/me/events/${eventId}`).delete();
};

const getMicrosoftUserInfo = async (accessToken) => {
  const client = getAuthenticatedClient(accessToken);
  const user = await client.api("/me").get();
  return user; // inneholder .mail og .userPrincipalName
};

module.exports = {
  getOutlookCalendar,
  createOutlookEvent,
  deleteOutlookEvent,
  getMicrosoftUserInfo,
};
