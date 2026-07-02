import { useEffect, useMemo, useState } from "react";
import { createParticipant, createSchedule } from "../data/scheduleFactory.js";
import {
  canUseRemoteStorage,
  loadRemoteSchedule,
  saveRemoteSchedule,
} from "../utils/scheduleStorage.js";
import { decodeScheduleHash, getEventIdFromHash, getShareUrl } from "../utils/share.js";

const OWNER_STORAGE_PREFIX = "schedule-time-matcher-owned";
const REMOTE_STORAGE_ENABLED = canUseRemoteStorage();

function loadInitialSchedule() {
  return decodeScheduleHash(window.location.hash);
}

function shouldLoadRemoteSchedule() {
  return Boolean(getEventIdFromHash(window.location.hash) && REMOTE_STORAGE_ENABLED);
}

function updateUrl(schedule) {
  window.history.replaceState(
    null,
    "",
    getShareUrl(schedule, { shortLink: REMOTE_STORAGE_ENABLED }),
  );
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
  const [isLoading, setIsLoading] = useState(shouldLoadRemoteSchedule);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [ownedParticipantIds, setOwnedParticipantIds] = useState(() =>
    loadOwnedParticipantIds(loadInitialSchedule()?.id),
  );

  useEffect(() => {
    let isActive = true;

    async function loadScheduleFromHash() {
      const decodedSchedule = loadInitialSchedule();
      const eventId = getEventIdFromHash(window.location.hash);

      if (decodedSchedule) {
        setSchedule(decodedSchedule);
        setIsLoading(false);
        setSyncError("");
        if (REMOTE_STORAGE_ENABLED) {
          try {
            await saveRemoteSchedule(decodedSchedule);
            if (isActive) updateUrl(decodedSchedule);
          } catch {
            if (isActive) {
              setSyncError("This event opened locally, but it could not sync to Supabase.");
            }
          }
        }
        return;
      }

      if (!eventId) {
        setSchedule(null);
        setIsLoading(false);
        setSyncError("");
        return;
      }

      if (!REMOTE_STORAGE_ENABLED) {
        setSchedule(null);
        setIsLoading(false);
        setSyncError("This event link needs Supabase environment variables.");
        return;
      }

      setIsLoading(true);
      setSyncError("");

      try {
        const remoteSchedule = await loadRemoteSchedule(eventId);
        if (!isActive) return;

        setSchedule(remoteSchedule);
        setSyncError(remoteSchedule ? "" : "That event was not found in Supabase.");
      } catch {
        if (isActive) {
          setSchedule(null);
          setSyncError("Supabase could not load that event.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    function handleHashChange() {
      void loadScheduleFromHash();
    }

    void loadScheduleFromHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      isActive = false;
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    setOwnedParticipantIds(loadOwnedParticipantIds(schedule?.id));
  }, [schedule?.id]);

  const shareUrl = useMemo(
    () =>
      schedule
        ? getShareUrl(schedule, { shortLink: REMOTE_STORAGE_ENABLED })
        : "",
    [schedule],
  );

  async function persistSchedule(nextSchedule) {
    setSchedule(nextSchedule);
    updateUrl(nextSchedule);
    setSyncError("");

    if (!REMOTE_STORAGE_ENABLED) return;

    setIsSyncing(true);
    try {
      await saveRemoteSchedule(nextSchedule);
    } catch {
      setSyncError("Saved in this browser, but Supabase did not accept the update.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function createEvent(details) {
    const nextSchedule = createSchedule(details);
    await persistSchedule(nextSchedule);
  }

  async function saveParticipant({ id, name, availability }) {
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
    await persistSchedule(nextSchedule);

    return true;
  }

  async function deleteParticipant(id) {
    if (!schedule) return;
    if (!ownedParticipantIds.includes(id)) return false;

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
    await persistSchedule(nextSchedule);
    return true;
  }

  function startNewEvent() {
    setSchedule(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  return {
    schedule,
    shareUrl,
    isLoading,
    isSyncing,
    syncError,
    ownedParticipantIds,
    createEvent,
    saveParticipant,
    deleteParticipant,
    startNewEvent,
  };
}
