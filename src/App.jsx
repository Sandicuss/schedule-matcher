import EventPage from "./components/EventPage.jsx";
import LandingPage from "./components/LandingPage.jsx";
import { useScheduleState } from "./hooks/useScheduleState.js";

export default function App() {
  const {
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
  } = useScheduleState();

  return (
    <main className="app-shell">
      {isLoading ? (
        <section className="landing-screen">
          <div className="create-panel">
            <p className="eyebrow">Schedule matcher</p>
            <h1>Loading event</h1>
            <p className="empty-note">Pulling the latest saved times from Supabase.</p>
          </div>
        </section>
      ) : schedule ? (
        <EventPage
          schedule={schedule}
          shareUrl={shareUrl}
          isSyncing={isSyncing}
          syncError={syncError}
          ownedParticipantIds={ownedParticipantIds}
          onSaveParticipant={saveParticipant}
          onDeleteParticipant={deleteParticipant}
          onStartNewEvent={startNewEvent}
        />
      ) : (
        <LandingPage loadError={syncError} onCreateEvent={createEvent} />
      )}
    </main>
  );
}
