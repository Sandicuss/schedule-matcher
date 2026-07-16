import { useEffect, useMemo, useState } from "react";
import { createParticipant, createSchedule } from "../data/scheduleFactory.js";
import {
  canUseRemoteStorage,
  createRemoteSchedule,
  loadRemoteSchedule,
  saveRemoteSchedule,
} from "../utils/scheduleStorage.js";
import {
  createRemoteWriteToken,
  decodeScheduleHash,
  getEventIdFromHash,
  getEventWriteTokenFromHash,
  getShareUrl,
} from "../utils/share.js";

const OWNER_STORAGE_PREFIX = "schedule-time-matcher-owned";
const REMOTE_STORAGE_ENABLED = canUseRemoteStorage();

function loadInitialSchedule() {
  return decodeScheduleHash(window.location.hash);
}

function shouldLoadRemoteSchedule() {
  return Boolean(getEventIdFromHash(window.location.hash) && REMOTE_STORAGE_ENABLED);
}

function loadInitialRemoteWriteToken() {
  return getEventWriteTokenFromHash(window.location.hash);
}

function updateUrl(schedule, writeToken = "") {
  window.history.replaceState(
    null,
    "",
    getShareUrl(schedule, {
      shortLink: REMOTE_STORAGE_ENABLED,
      writeToken,
    }),
  );
}

function getReadOnlyRemoteMessage() {
  return "This event link is read-only because it is missing its private edit token.";
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
  const [remoteWriteToken, setRemoteWriteToken] = useState(
    loadInitialRemoteWriteToken,
  );
  const [ownedParticipantIds, setOwnedParticipantIds] = useState(() =>
    loadOwnedParticipantIds(loadInitialSchedule()?.id),
  );

  useEffect(() => {
    let isActive = true;

    async function loadScheduleFromHash() {
      const hash = window.location.hash;
      const decodedSchedule = decodeScheduleHash(hash);
      const eventId = getEventIdFromHash(hash);
      const eventWriteToken = getEventWriteTokenFromHash(hash);

      if (decodedSchedule) {
        setSchedule(decodedSchedule);
        setIsLoading(false);
        setSyncError("");
        if (REMOTE_STORAGE_ENABLED) {
          const writeToken = eventWriteToken || createRemoteWriteToken();
          setRemoteWriteToken(writeToken);
          try {
            await createRemoteSchedule(decodedSchedule, writeToken);
            if (isActive) updateUrl(decodedSchedule, writeToken);
          } catch {
            if (isActive) {
              setSyncError("This event opened locally, but it could not sync to Supabase.");
            }
          }
        } else {
          setRemoteWriteToken("");
        }
        return;
      }

      if (!eventId) {
        setSchedule(null);
        setIsLoading(false);
        setSyncError("");
        setRemoteWriteToken("");
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
      setRemoteWriteToken(eventWriteToken);

      try {
        const remoteSchedule = await loadRemoteSchedule(eventId);
        if (!isActive) return;

        setSchedule(remoteSchedule);
        setSyncError(
          remoteSchedule
            ? eventWriteToken
              ? ""
              : getReadOnlyRemoteMessage()
            : "That event was not found in Supabase.",
        );
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
        ? getShareUrl(schedule, {
            shortLink: REMOTE_STORAGE_ENABLED,
            writeToken: remoteWriteToken,
          })
        : "",
    [remoteWriteToken, schedule],
  );

  async function persistSchedule(
    nextSchedule,
    { createRemote = false, writeToken = remoteWriteToken } = {},
  ) {
    if (REMOTE_STORAGE_ENABLED && !writeToken) {
      setSyncError(getReadOnlyRemoteMessage());
      return false;
    }

    setSchedule(nextSchedule);
    updateUrl(nextSchedule, writeToken);
    setSyncError("");

    if (!REMOTE_STORAGE_ENABLED) return true;

    setIsSyncing(true);
    try {
      if (createRemote) {
        await createRemoteSchedule(nextSchedule, writeToken);
      } else {
        await saveRemoteSchedule(nextSchedule, writeToken);
      }
      return true;
    } catch {
      setSyncError("Saved in this browser, but Supabase did not accept the update.");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }

  async function createEvent(details) {
    const nextSchedule = createSchedule(details);

    if (!REMOTE_STORAGE_ENABLED) {
      await persistSchedule(nextSchedule);
      return;
    }

    const writeToken = createRemoteWriteToken();
    setIsSyncing(true);
    setSyncError("");

    try {
      await createRemoteSchedule(nextSchedule, writeToken);
      setRemoteWriteToken(writeToken);
      setSchedule(nextSchedule);
      updateUrl(nextSchedule, writeToken);
    } catch {
      setSyncError("Supabase did not accept the new event. Check the SQL schema and project settings.");
    } finally {
      setIsSyncing(false);
    }
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

    const wasPersisted = await persistSchedule(nextSchedule);
    if (!wasPersisted) return false;

    if (existingIndex < 0) {
      const nextOwnedIds = [...new Set([...ownedParticipantIds, participant.id])];
      setOwnedParticipantIds(nextOwnedIds);
      saveOwnedParticipantIds(schedule.id, nextOwnedIds);
    }

    return true;
  }

  async function deleteParticipant(id) {
    if (!schedule) return;
    if (!ownedParticipantIds.includes(id)) return false;

    const nextSchedule = {
      ...schedule,
      participants: schedule.participants.filter((person) => person.id !== id),
    };

    const wasPersisted = await persistSchedule(nextSchedule);
    if (!wasPersisted) return false;

    const nextOwnedIds = ownedParticipantIds.filter(
      (participantId) => participantId !== id,
    );
    setOwnedParticipantIds(nextOwnedIds);
    saveOwnedParticipantIds(schedule.id, nextOwnedIds);
    return true;
  }

  function startNewEvent() {
    setSchedule(null);
    setRemoteWriteToken("");
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
