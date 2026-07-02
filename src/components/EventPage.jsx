import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Link2,
  Pencil,
  Save,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AvailabilityGrid from "./AvailabilityGrid.jsx";
import OverlapSummary from "./OverlapSummary.jsx";
import { buildCalendarDays, buildTimeSlots, formatSlot } from "../utils/dateSlots.js";
import { getOverlapSummary, getSlotStatus } from "../utils/availability.js";

function formatEventDates(schedule) {
  const start = format(parseISO(schedule.startDate), "MMM d");
  const end = format(parseISO(schedule.endDate), "MMM d");
  return start === end ? start : `${start} to ${end}`;
}

function countAvailability(availability) {
  return Object.values(availability).filter(Boolean).length;
}

function SlotDetails({ selectedSlot }) {
  return (
    <section className="slot-details">
      <div className="panel-title">
        <h2>{selectedSlot ? selectedSlot.label : "Tap a time"}</h2>
        <Clock size={18} aria-hidden="true" />
      </div>
      {selectedSlot ? (
        selectedSlot.people.length ? (
          <div className="people-list">
            {selectedSlot.people.map((person) => (
              <span className="person-chip" key={person.id}>
                <i style={{ "--person-color": person.color }} aria-hidden="true" />
                {person.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-note">No saved people for this time yet.</p>
        )
      ) : (
        <p className="empty-note">You can tap any time to see who saved it.</p>
      )}
    </section>
  );
}

export default function EventPage({
  schedule,
  shareUrl,
  ownedParticipantIds,
  onSaveParticipant,
  onDeleteParticipant,
  onStartNewEvent,
}) {
  const [name, setName] = useState("");
  const [availability, setAvailability] = useState({});
  const [editingParticipantId, setEditingParticipantId] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const days = buildCalendarDays(schedule.startDate, schedule.endDate);
  const timeSlots = buildTimeSlots(
    schedule.startTime,
    schedule.endTime,
    schedule.slotMinutes,
  );
  const editingParticipant = schedule.participants.find(
    (person) => person.id === editingParticipantId,
  );
  const summary = useMemo(
    () => getOverlapSummary(schedule.participants, days, timeSlots),
    [days, schedule.participants, timeSlots],
  );
  const selectedSlot = useMemo(() => {
    if (!selectedSlotKey) return null;

    for (const day of days) {
      for (const slot of timeSlots) {
        const status = getSlotStatus(schedule.participants, day.key, slot.key);
        if (status.slotKey === selectedSlotKey) {
          return {
            ...status,
            day,
            slot,
            label: formatSlot(day, slot),
          };
        }
      }
    }

    return null;
  }, [days, schedule.participants, selectedSlotKey, timeSlots]);
  const selectedCount = countAvailability(availability);
  const trimmedName = name.trim();
  const duplicateName =
    !editingParticipantId &&
    trimmedName &&
    schedule.participants.some(
      (person) => person.name.toLowerCase() === trimmedName.toLowerCase(),
    );
  const canEditSelected =
    !editingParticipant || ownedParticipantIds.includes(editingParticipant.id);
  const canSave =
    trimmedName &&
    !duplicateName &&
    canEditSelected &&
    (selectedCount > 0 || Boolean(editingParticipantId));
  const canEditAvailability = Boolean(trimmedName) && !duplicateName && canEditSelected;

  useEffect(() => {
    if (
      editingParticipantId &&
      !schedule.participants.some((person) => person.id === editingParticipantId)
    ) {
      clearEditor();
    }
  }, [editingParticipantId, schedule.participants]);

  function clearEditor() {
    setName("");
    setAvailability({});
    setEditingParticipantId("");
    setSaved(false);
  }

  function editParticipant(person) {
    setName(person.name);
    setAvailability({ ...person.availability });
    setEditingParticipantId(person.id);
    setSaved(false);
  }

  function deleteParticipant(person) {
    if (editingParticipantId === person.id) {
      clearEditor();
    }

    onDeleteParticipant(person.id);
  }

  function toggleAvailability(slotKey) {
    setSaved(false);
    setAvailability((current) => {
      const next = { ...current };
      if (next[slotKey]) {
        delete next[slotKey];
      } else {
        next[slotKey] = true;
      }
      return next;
    });
  }

  function handleSave(event) {
    event.preventDefault();
    if (!canSave) return;

    const wasSaved = onSaveParticipant({
      id: editingParticipantId,
      name: trimmedName,
      availability,
    });
    if (!wasSaved) return;

    clearEditor();
    setSaved(true);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="event-screen">
      <header className="event-header">
        <button className="back-button" type="button" onClick={onStartNewEvent}>
          <ArrowLeft size={18} aria-hidden="true" />
          New event
        </button>
        <div>
          <p className="eyebrow">{formatEventDates(schedule)}</p>
          <h1>{schedule.title}</h1>
        </div>
        <button className="copy-button" type="button" onClick={copyLink}>
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </header>

      <div className="event-layout">
        <aside className="join-panel">
          <form className="name-panel" onSubmit={handleSave}>
            <div className="panel-title">
              <h2>{editingParticipant ? `Edit ${editingParticipant.name}` : "Add availability"}</h2>
              <span className="count-chip">{selectedCount}</span>
            </div>
            <label>
              Your name
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                placeholder="Your name"
                readOnly={Boolean(editingParticipant)}
                required
              />
            </label>
            {editingParticipant && (
              <p className="helper-note">
                Picked name is locked while editing saved times.
              </p>
            )}
            {duplicateName && (
              <p className="warning-note">
                That name is already saved. Use the edit button on that person.
              </p>
            )}
            <div className="form-actions">
              <button className="primary-action" type="submit" disabled={!canSave}>
                <Save size={18} aria-hidden="true" />
                Save
              </button>
              {editingParticipant && (
                <button className="secondary-action" type="button" onClick={clearEditor}>
                  <X size={18} aria-hidden="true" />
                  Cancel
                </button>
              )}
            </div>
            {saved && <p className="saved-note">Saved</p>}
          </form>

          <section className="link-panel">
            <div className="panel-title">
              <h2>Event link</h2>
              <Link2 size={18} aria-hidden="true" />
            </div>
            <input value={shareUrl} readOnly aria-label="Event link" />
          </section>

          <section className="people-panel">
            <div className="panel-title">
              <h2>Saved people</h2>
              <UsersRound size={18} aria-hidden="true" />
            </div>
            {schedule.participants.length ? (
              <div className="saved-people-list">
                {schedule.participants.map((person) => (
                  <div className="saved-person-row" key={person.id}>
                    <span className="person-chip">
                      <i
                        style={{ "--person-color": person.color }}
                        aria-hidden="true"
                      />
                      {person.name}
                    </span>
                    <div className="person-actions">
                      <button
                        className="small-icon-button"
                        type="button"
                        onClick={() => editParticipant(person)}
                        disabled={!ownedParticipantIds.includes(person.id)}
                        aria-label={`Edit ${person.name}`}
                        title={`Edit ${person.name}`}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="small-icon-button danger"
                        type="button"
                        onClick={() => deleteParticipant(person)}
                        aria-label={`Delete ${person.name}`}
                        title={`Delete ${person.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">No saved names yet.</p>
            )}
          </section>
        </aside>

        <section className="schedule-panel">
          <OverlapSummary
            summary={summary}
            peopleCount={schedule.participants.length}
          />
          <SlotDetails selectedSlot={selectedSlot} />
          <AvailabilityGrid
            days={days}
            timeSlots={timeSlots}
            participants={schedule.participants}
            selectedAvailability={availability}
            canEditAvailability={canEditAvailability}
            onToggleAvailability={toggleAvailability}
            onSelectSlot={setSelectedSlotKey}
          />
        </section>
      </div>
    </section>
  );
}
