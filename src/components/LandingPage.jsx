import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const DATE_MODES = {
  individual: "individual",
  range: "range",
};

function isoDate(date) {
  return format(date, "yyyy-MM-dd");
}

function isValidDateKey(dateKey) {
  const date = parseISO(dateKey);
  return isValid(date) && isoDate(date) === dateKey;
}

function isBeforeDateKey(dateKey, minDateKey) {
  return Boolean(minDateKey && dateKey < minDateKey);
}

function normalizeDateKeys(dateKeys, minDateKey = "") {
  return [...new Set(dateKeys)]
    .filter(isValidDateKey)
    .filter((dateKey) => !isBeforeDateKey(dateKey, minDateKey))
    .sort();
}

function buildDateRangeKeys(startDate, endDate, minDateKey = "") {
  if (!startDate) return [];

  const firstDate = endDate && endDate < startDate ? endDate : startDate;
  const lastDate = endDate && endDate < startDate ? startDate : endDate || startDate;
  const firstAllowedDate =
    minDateKey && firstDate < minDateKey ? minDateKey : firstDate;

  if (minDateKey && lastDate < minDateKey) return [];

  const dates = [];
  let current = parseISO(firstAllowedDate);
  const last = parseISO(lastDate);

  while (current <= last) {
    dates.push(isoDate(current));
    current = addDays(current, 1);
  }

  return dates;
}

function buildMonthGrid(monthDate) {
  const gridStart = startOfWeek(startOfMonth(monthDate));

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function LandingPage({ loadError, onCreateEvent }) {
  const today = isoDate(new Date());
  const [title, setTitle] = useState("");
  const [dateMode, setDateMode] = useState(DATE_MODES.individual);
  const [selectedDates, setSelectedDates] = useState([today]);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(isoDate(addDays(new Date(), 3)));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [isCreating, setIsCreating] = useState(false);
  const activeDates =
    dateMode === DATE_MODES.range
      ? buildDateRangeKeys(rangeStart, rangeEnd, today)
      : normalizeDateKeys(selectedDates, today);
  const selectedDateSet = new Set(activeDates);
  const monthDays = buildMonthGrid(visibleMonth);

  function updateDateMode(nextMode) {
    if (nextMode === dateMode) return;

    if (nextMode === DATE_MODES.range) {
      const dates = normalizeDateKeys(selectedDates, today);
      const nextStart = dates[0] ?? today;
      setRangeStart(nextStart);
      setRangeEnd(dates[dates.length - 1] ?? nextStart);
    } else {
      setSelectedDates(activeDates);
    }

    setDateMode(nextMode);
  }

  function toggleIndividualDate(dateKey) {
    setSelectedDates((currentDates) => {
      if (currentDates.includes(dateKey)) {
        return currentDates.filter((selectedDate) => selectedDate !== dateKey);
      }

      return normalizeDateKeys([...currentDates, dateKey], today);
    });
  }

  function chooseRangeDate(dateKey) {
    if (isBeforeDateKey(dateKey, today)) return;

    if (!rangeStart || rangeEnd) {
      setRangeStart(dateKey);
      setRangeEnd("");
      return;
    }

    const dates = buildDateRangeKeys(rangeStart, dateKey, today);
    setRangeStart(dates[0]);
    setRangeEnd(dates[dates.length - 1]);
  }

  function handleDateClick(day) {
    const dateKey = isoDate(day);
    if (isBeforeDateKey(dateKey, today)) return;

    if (!isSameMonth(day, visibleMonth)) {
      setVisibleMonth(startOfMonth(day));
    }

    if (dateMode === DATE_MODES.range) {
      chooseRangeDate(dateKey);
      return;
    }

    toggleIndividualDate(dateKey);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!activeDates.length) return;

    setIsCreating(true);
    try {
      await onCreateEvent({
        title,
        startDate: activeDates[0],
        endDate: activeDates[activeDates.length - 1],
        dateSelectionMode: dateMode,
        selectedDates: activeDates,
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="landing-screen">
      <form className="create-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">
          <CalendarPlus size={17} aria-hidden="true" />
          Schedule matcher
        </p>
        <h1>Create event</h1>
        {loadError && <p className="warning-note">{loadError}</p>}

        <label>
          Event name
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Movie night"
            required
          />
        </label>

        <div className="date-mode-toggle" role="group" aria-label="Date selection mode">
          <button
            className={dateMode === DATE_MODES.individual ? "is-active" : ""}
            type="button"
            onClick={() => updateDateMode(DATE_MODES.individual)}
          >
            Exact days
          </button>
          <button
            className={dateMode === DATE_MODES.range ? "is-active" : ""}
            type="button"
            onClick={() => updateDateMode(DATE_MODES.range)}
          >
            Date range
          </button>
        </div>

        <section className="calendar-picker" aria-label="Choose event dates">
          <div className="calendar-header">
            <button
              className="calendar-nav-button"
              type="button"
              onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{format(visibleMonth, "MMMM yyyy")}</strong>
            <button
              className="calendar-nav-button"
              type="button"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {monthDays.map((day) => {
              const dateKey = isoDate(day);
              const isSelected = selectedDateSet.has(dateKey);
              const isPastDate = isBeforeDateKey(dateKey, today);
              const isRangeEdge =
                dateMode === DATE_MODES.range &&
                (dateKey === rangeStart || dateKey === rangeEnd);

              return (
                <button
                  className={[
                    "calendar-day",
                    !isSameMonth(day, visibleMonth) ? "outside-month" : "",
                    isSelected ? "is-selected" : "",
                    isRangeEdge ? "is-range-edge" : "",
                    isPastDate ? "is-past" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  disabled={isPastDate}
                  aria-pressed={isSelected}
                  aria-label={`${format(day, "EEEE, MMMM d")}${
                    isPastDate ? ", unavailable" : isSelected ? ", selected" : ""
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="date-selection-summary" aria-live="polite">
            <strong>
              {activeDates.length} {activeDates.length === 1 ? "day" : "days"} selected
            </strong>
            <div>
              {activeDates.map((dateKey) => (
                <span className="date-chip" key={dateKey}>
                  {format(parseISO(dateKey), "MMM d")}
                </span>
              ))}
            </div>
          </div>
        </section>

        <button
          className="primary-action"
          type="submit"
          disabled={isCreating || !activeDates.length}
        >
          <CalendarPlus size={19} aria-hidden="true" />
          {isCreating ? "Creating" : "Create event"}
        </button>
      </form>
    </section>
  );
}
