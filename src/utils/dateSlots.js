import { addDays, format, isAfter, isValid, parseISO } from "date-fns";

function parseDate(value) {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function makeDay(date) {
  return {
    key: format(date, "yyyy-MM-dd"),
    weekday: format(date, "EEE"),
    label: format(date, "MMM d"),
  };
}

function normalizeSelectedDates(selectedDates) {
  if (!Array.isArray(selectedDates)) return [];

  return [...new Set(selectedDates)]
    .filter((dateKey) => parseDate(dateKey))
    .sort();
}

export function buildCalendarDays(startDate, endDate, selectedDates) {
  const exactDates = normalizeSelectedDates(selectedDates);

  if (exactDates.length) {
    return exactDates.map((dateKey) => makeDay(parseDate(dateKey)));
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return [];

  const lastDate = isAfter(start, end) ? start : end;
  const days = [];
  let current = start;

  while (!isAfter(current, lastDate)) {
    days.push(makeDay(current));
    current = addDays(current, 1);
  }

  return days;
}

export function buildTimeSlots(startTime, endTime, slotMinutes) {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  const safeEnd = end > start ? end : start + Number(slotMinutes);
  const slots = [];

  for (let minute = start; minute < safeEnd; minute += Number(slotMinutes)) {
    const value = timeFromMinutes(minute);
    slots.push({
      key: value,
      value,
      label: format(new Date(2024, 0, 1, 0, minute), "h:mm a"),
    });
  }

  return slots;
}

export function formatSlot(day, slot) {
  const date = parseDate(day.key);
  return `${format(date, "EEE, MMM d")} at ${slot.label}`;
}

export function makeSlotKey(dayKey, timeKey) {
  return `${dayKey}|${timeKey}`;
}
