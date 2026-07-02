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

export function getShareUrl(schedule, { shortLink = false } = {}) {
  if (shortLink) {
    return `${window.location.origin}${window.location.pathname}${EVENT_HASH_PREFIX}${encodeURIComponent(
      schedule.id,
    )}`;
  }

  const payload = toBase64Url(JSON.stringify({ version: 1, schedule }));
  return `${window.location.origin}${window.location.pathname}${EVENT_HASH_PREFIX}${payload}`;
}

export function decodeScheduleHash(hash) {
  const key = hash.startsWith(EVENT_HASH_PREFIX) ? EVENT_HASH_PREFIX : "#schedule=";
  if (!hash.startsWith(key)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(hash.replace(key, "")));
    return payload.version === 1 ? payload.schedule : null;
  } catch {
    return null;
  }
}

export function getEventIdFromHash(hash) {
  if (!hash.startsWith(EVENT_HASH_PREFIX) || decodeScheduleHash(hash)) {
    return "";
  }

  return decodeURIComponent(hash.replace(EVENT_HASH_PREFIX, ""));
}
