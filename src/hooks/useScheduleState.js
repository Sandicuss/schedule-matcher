import { useEffect, useMemo, useState } from "react";
import { createParticipant, createSchedule } from "../data/scheduleFactory.js";
import { decodeScheduleHash, getShareUrl } from "../utils/share.js";

const OWNER_STORAGE_PREFIX = "schedule-time-matcher-owned";

function loadInitialSchedule() {
  return decodeScheduleHash(window.location.hash);
}

function updateUrl(schedule) {
  window.history.replaceState(null, "", getShareUrl(schedule));
}

function getOwnerStorageKey(scheduleId) {
  return `${OWNER_STORAGE_PREFIX}-${scheduleId}`;
}

function loadOwnedParticipantIds(scheduleId) {
  if (!scheduleId) return [];

  try {
    return JSON.parse(window.localStorage.getItem(getOwnerStorageKey(scheduleId))) ?? [];
  } catch {
    return [];
  }
}

function saveOwnedParticipantIds(scheduleId, ids) {
  window.localStorage.setItem(getOwnerStorageKey(scheduleId), JSON.stringify(ids));
}

export function useScheduleState() {
  const [schedule, setSchedule] = useState(loadInitialSchedule);
  const [ownedParticipantIds, setOwnedParticipantIds] = useState(() =>
    loadOwnedParticipantIds(loadInitialSchedule()?.id),
  );

  useEffect(() => {
    function handleHashChange() {
      setSchedule(loadInitialSchedule());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setOwnedParticipantIds(loadOwnedParticipantIds(schedule?.id));
  }, [schedule?.id]);

  const shareUrl = useMemo(() => (schedule ? getShareUrl(schedule) : ""), [schedule]);

  function createEvent(details) {
    const nextSchedule = createSchedule(details);
    setSchedule(nextSchedule);
    updateUrl(nextSchedule);
  }

  function saveParticipant({ id, name, availability }) {
    const trimmedName = name.trim();
    if (!schedule || !trimmedName) return false;

    const existingIndex = id
      ? schedule.participants.findIndex((person) => person.id === id)
      : -1;
    if (existingIndex >= 0 && !ownedParticipantIds.includes(id)) {
      return false;
    }

    const participant =
      existingIndex >= 0
        ? {
            ...schedule.participants[existingIndex],
            availability,
          }
        : createParticipant(trimmedName, schedule.participants.length, availability);
    const participants =
      existingIndex >= 0
        ? schedule.participants.map((person, index) =>
            index === existingIndex ? participant : person,
          )
        : [...schedule.participants, participant];
    const nextSchedule = {
      ...schedule,
      participants,
    };

    setSchedule(nextSchedule);
    updateUrl(nextSchedule);
    if (existingIndex < 0) {
      const nextOwnedIds = [...new Set([...ownedParticipantIds, participant.id])];
      setOwnedParticipantIds(nextOwnedIds);
      saveOwnedParticipantIds(schedule.id, nextOwnedIds);
    }

    return true;
  }

  function deleteParticipant(id) {
    if (!schedule) return;

    const nextSchedule = {
      ...schedule,
      participants: schedule.participants.filter((person) => person.id !== id),
    };

    setSchedule(nextSchedule);
    updateUrl(nextSchedule);
    const nextOwnedIds = ownedParticipantIds.filter(
      (participantId) => participantId !== id,
    );
    setOwnedParticipantIds(nextOwnedIds);
    saveOwnedParticipantIds(schedule.id, nextOwnedIds);
  }

  function startNewEvent() {
    setSchedule(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  return {
    schedule,
    shareUrl,
    ownedParticipantIds,
    createEvent,
    saveParticipant,
    deleteParticipant,
    startNewEvent,
  };
}
