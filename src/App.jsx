import EventPage from "./components/EventPage.jsx";
import LandingPage from "./components/LandingPage.jsx";
import { useScheduleState } from "./hooks/useScheduleState.js";

export default function App() {
  const {
    schedule,
    shareUrl,
    ownedParticipantIds,
    createEvent,
    saveParticipant,
    deleteParticipant,
    startNewEvent,
  } = useScheduleState();

  return (
    <main className="app-shell">
      {schedule ? (
        <EventPage
          schedule={schedule}
          shareUrl={shareUrl}
          ownedParticipantIds={ownedParticipantIds}
          onSaveParticipant={saveParticipant}
          onDeleteParticipant={deleteParticipant}
          onStartNewEvent={startNewEvent}
        />
      ) : (
        <LandingPage onCreateEvent={createEvent} />
      )}
    </main>
  );
}
