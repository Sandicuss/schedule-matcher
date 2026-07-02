import { addDays, format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

function isoDate(date) {
  return format(date, "yyyy-MM-dd");
}

export default function LandingPage({ onCreateEvent }) {
  const today = isoDate(new Date());
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(isoDate(addDays(new Date(), 3)));

  function handleSubmit(event) {
    event.preventDefault();
    onCreateEvent({
      title,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
    });
  }

  return (
    <section className="landing-screen">
      <form className="create-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">
          <CalendarPlus size={17} aria-hidden="true" />
          Schedule matcher
        </p>
        <h1>Create event</h1>

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

        <button className="primary-action" type="submit">
          <CalendarPlus size={19} aria-hidden="true" />
          Create event
        </button>
      </form>
    </section>
  );
}
