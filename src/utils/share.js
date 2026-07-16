function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const EVENT_HASH_PREFIX = "#event=";
const LEGACY_SCHEDULE_HASH_PREFIX = "#schedule=";
const REMOTE_EVENT_SEPARATOR = ".";

export function createRemoteWriteToken() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return toBase64Url(crypto.randomUUID());
  }

  return toBase64Url(`${Date.now()}-${Math.random()}-${Math.random()}`);
}

function decodeHashPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function parseEventReference(hash) {
  if (!hash.startsWith(EVENT_HASH_PREFIX) || decodeScheduleHash(hash)) {
    return { id: "", writeToken: "" };
  }

  const value = hash.replace(EVENT_HASH_PREFIX, "");
  const separatorIndex = value.indexOf(REMOTE_EVENT_SEPARATOR);
  const encodedId =
    separatorIndex >= 0 ? value.slice(0, separatorIndex) : value;
  const encodedToken = separatorIndex >= 0 ? value.slice(separatorIndex + 1) : "";

  return {
    id: decodeHashPart(encodedId),
    writeToken: decodeHashPart(encodedToken),
  };
}

export function getShareUrl(schedule, { shortLink = false, writeToken = "" } = {}) {
  if (shortLink) {
    const tokenPart = writeToken
      ? `${REMOTE_EVENT_SEPARATOR}${encodeURIComponent(writeToken)}`
      : "";

    return `${window.location.origin}${window.location.pathname}${EVENT_HASH_PREFIX}${encodeURIComponent(
      schedule.id,
    )}${tokenPart}`;
  }

  const payload = toBase64Url(JSON.stringify({ version: 1, schedule }));
  return `${window.location.origin}${window.location.pathname}${EVENT_HASH_PREFIX}${payload}`;
}

export function decodeScheduleHash(hash) {
  const key = hash.startsWith(EVENT_HASH_PREFIX)
    ? EVENT_HASH_PREFIX
    : LEGACY_SCHEDULE_HASH_PREFIX;
  if (!hash.startsWith(key)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(hash.replace(key, "")));
    return payload.version === 1 ? payload.schedule : null;
  } catch {
    return null;
  }
}

export function getEventIdFromHash(hash) {
  return parseEventReference(hash).id;
}

export function getEventWriteTokenFromHash(hash) {
  return parseEventReference(hash).writeToken;
}
