import { Check } from "lucide-react";
import { getSlotStatus } from "../utils/availability.js";

export default function AvailabilityGrid({
  days,
  timeSlots,
  participants,
  selectedAvailability,
  canEditAvailability,
  onToggleAvailability,
  onSelectSlot,
}) {
  return (
    <div className="grid-shell">
      <div
        className="availability-grid"
        style={{ "--day-count": Math.max(days.length, 1) }}
      >
        <div className="grid-corner">Time</div>
        {days.map((day) => (
          <div className="day-heading" key={day.key}>
            <strong>{day.weekday}</strong>
            <span>{day.label}</span>
          </div>
        ))}

        {timeSlots.map((slot) => (
          <div className="grid-row" key={slot.key}>
            <div className="time-label">{slot.label}</div>
            {days.map((day) => {
              const status = getSlotStatus(participants, day.key, slot.key);
              const isSelected = Boolean(selectedAvailability?.[status.slotKey]);

              return (
                <button
                  type="button"
                  className={`slot-cell heat-${status.level} ${
                    status.isFullMatch ? "is-full-match" : ""
                  } ${isSelected ? "is-selected" : ""}`}
                  key={status.slotKey}
                  onClick={() => {
                    if (canEditAvailability) {
                      onToggleAvailability(status.slotKey);
                    }
                    onSelectSlot(status.slotKey);
                  }}
                  aria-label={`${day.weekday} ${day.label} ${slot.label}, ${status.count} of ${status.total} available`}
                >
                  <span>{status.count}</span>
                  {isSelected && <Check size={15} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="heat-legend" aria-label="Availability color legend">
        <span>0</span>
        <i className="heat-1" />
        <span>1</span>
        <i className="heat-2" />
        <span>2</span>
        <i className="heat-3" />
        <span>3</span>
        <i className="heat-4" />
        <span>4</span>
        <i className="heat-5" />
        <span>5</span>
        <i className="heat-6" />
        <span>6+</span>
      </div>
    </div>
  );
}
