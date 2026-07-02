const participantColors = [
  "#ff5c8a",
  "#38bdf8",
  "#f59e0b",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#14b8a6",
];

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getParticipantColor(index) {
  return participantColors[index % participantColors.length];
}

export function createParticipant(name, index, availability = {}) {
  return {
    id: createId("person"),
    name,
    color: getParticipantColor(index),
    availability,
  };
}

export function createSchedule({ title, startDate, endDate }) {
  return {
    id: createId("event"),
    title: title.trim() || "Untitled event",
    startDate,
    endDate,
    startTime: "08:00",
    endTime: "23:00",
    slotMinutes: 60,
    participants: [],
  };
}
