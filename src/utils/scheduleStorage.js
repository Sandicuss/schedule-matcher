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

export async function saveRemoteSchedule(schedule) {
  if (!canUseRemoteStorage()) {
    return schedule;
  }

  const { data, error } = await supabase.rpc("save_event", {
    event_id: schedule.id,
    event_schedule: schedule,
  });

  if (error) {
    throw error;
  }

  return data;
}
