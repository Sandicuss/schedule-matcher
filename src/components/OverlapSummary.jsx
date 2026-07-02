import { PartyPopper, Users } from "lucide-react";

function formatPeople(slot) {
  return slot.people.map((person) => person.name).join(", ");
}

export default function OverlapSummary({ summary, peopleCount }) {
  const topFullMatches = summary.fullMatches.slice(0, 4);
  const topPartialMatches = summary.bestPartialMatches.slice(0, 3);

  return (
    <section className="summary-strip" aria-live="polite">
      <div className="summary-lead">
        <PartyPopper size={22} aria-hidden="true" />
        <div>
          <p>Everyone free</p>
          <strong>
            {peopleCount === 0
              ? "No saved availability yet"
              : topFullMatches.length
              ? topFullMatches.map((match) => match.label).join(" | ")
              : "No perfect overlap yet"}
          </strong>
        </div>
      </div>

      <div className="summary-details">
        {topPartialMatches.length ? (
          topPartialMatches.map((match) => (
            <span className="mini-match" key={`${match.day.key}-${match.slot.key}`}>
              <Users size={14} aria-hidden="true" />
              {match.label}: {match.count}/{peopleCount} ({formatPeople(match)})
            </span>
          ))
        ) : (
          <span className="mini-match">Best overlaps will show here</span>
        )}
      </div>
    </section>
  );
}
