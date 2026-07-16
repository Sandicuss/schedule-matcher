import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export function canUseRemoteStorage() {
  return isSupabaseConfigured && supabase;
}

export async function loadRemoteSchedule(scheduleId) {
  if (!canUseRemoteStorage()) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("get_event", {
    event_id: scheduleId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createRemoteSchedule(schedule, writeToken) {
  if (!canUseRemoteStorage()) {
    return schedule;
  }

  if (!writeToken) {
    throw new Error("A private edit token is required to create remote events.");
  }

  const { data, error } = await supabase.rpc("create_event", {
    event_id: schedule.id,
    event_schedule: schedule,
    write_token: writeToken,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function saveRemoteSchedule(schedule, writeToken) {
  if (!canUseRemoteStorage()) {
    return schedule;
  }

  if (!writeToken) {
    throw new Error("A private edit token is required to update remote events.");
  }

  const { data, error } = await supabase.rpc("save_event", {
    event_id: schedule.id,
    event_schedule: schedule,
    write_token: writeToken,
  });

  if (error) {
    throw error;
  }

  return data;
}
