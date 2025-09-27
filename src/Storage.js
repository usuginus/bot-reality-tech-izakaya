/******************************************************
 * Known user persistence helpers
 ******************************************************/
const KNOWN_USERS_KEY = "KNOWN_USER_IDS_JSON";

function loadKnownUserIds_() {
  const raw = PropertiesService.getScriptProperties().getProperty(
    KNOWN_USERS_KEY
  );
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveKnownUserIds_(set) {
  PropertiesService.getScriptProperties().setProperty(
    KNOWN_USERS_KEY,
    JSON.stringify(Array.from(set))
  );
}
