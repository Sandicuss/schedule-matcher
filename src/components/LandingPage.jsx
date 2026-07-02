import { addDays, format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

function isoDate(date) {
  return format(date, "yyyy-MM-dd");
}

export default function LandingPage({ loadError, onCreateEvent }) {
  const today = isoDate(new Date());
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(isoDate(addDays(new Date(), 3)));
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsCreating(true);
    try {
      await onCreateEvent({
        title,
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
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

        <div className="field-grid">
          <label>
            First day
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label>
            Last day
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
        </div>

        <button className="primary-action" type="submit" disabled={isCreating}>
          <CalendarPlus size={19} aria-hidden="true" />
          {isCreating ? "Creating" : "Create event"}
        </button>
      </form>
    </section>
  );
}
