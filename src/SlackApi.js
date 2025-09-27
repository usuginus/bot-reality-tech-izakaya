/******************************************************
 * Slack API client helpers
 ******************************************************/
const SLACK_API_BASE = "https://slack.com/api";

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty(
    "SLACK_BOT_TOKEN"
  );
  if (!token)
    throw new Error("SLACK_BOT_TOKEN is not set in Script Properties.");
  return token;
}

function slackFetch_(endpoint, payload) {
  const token = getToken_();
  const res = UrlFetchApp.fetch(`${SLACK_API_BASE}/${endpoint}`, {
    method: "post",
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    payload: JSON.stringify(payload || {}),
  });
  const json = JSON.parse(res.getContentText());
  if (!json.ok)
    throw new Error(
      `${endpoint} failed: ${json.error || res.getResponseCode()}`
    );
  return json;
}

function postMessage_(channelId, text, blocks) {
  return slackFetch_("chat.postMessage", {
    channel: channelId,
    text,
    blocks: blocks || undefined,
  });
}
