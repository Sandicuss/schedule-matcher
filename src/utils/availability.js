import { formatSlot, makeSlotKey } from "./dateSlots.js";

function getSlotPeople(participants, slotKey) {
  return participants.filter((person) => person.availability?.[slotKey]);
}

export function getSlotStatus(participants, dayKey, timeKey) {
  const slotKey = makeSlotKey(dayKey, timeKey);
  const availablePeople = getSlotPeople(participants, slotKey);
  const total = participants.length;
  const count = availablePeople.length;

  return {
    slotKey,
    count,
    total,
    people: availablePeople,
    isFullMatch: total > 0 && count === total,
    level: Math.min(6, count),
  };
}

export function getOverlapSummary(participants, days, timeSlots) {
  const fullMatches = [];
  const rankedSlots = [];

  days.forEach((day) => {
    timeSlots.forEach((slot) => {
      const status = getSlotStatus(participants, day.key, slot.key);
      if (status.count > 0) {
        rankedSlots.push({
          ...status,
          day,
          slot,
          label: formatSlot(day, slot),
        });
      }

      if (status.isFullMatch) {
        fullMatches.push({
          ...status,
          day,
          slot,
          label: formatSlot(day, slot),
        });
      }
    });
  });

  const bestPartialMatches = rankedSlots
    .filter((slot) => !slot.isFullMatch)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    fullMatches,
    bestPartialMatches,
  };
}
