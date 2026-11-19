import { useApiData } from '../api/useApiData.js';

type Suggestion = { title: string; reason: string };

// Until sign-in exists, the page shows suggestions for the seeded demo user.
const demoUserEmail = 'mona@example.com';

export default function Workouts() {
  const state = useApiData<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(demoUserEmail)}`);

  return (
    <section>
      <h2 className="h4">Workout suggestions</h2>
      <p>Recommend workouts from activity patterns.</p>
      {state.status === 'loading' && <p role="status">Loading workout suggestions…</p>}
      {state.status === 'error' && <p role="alert">Unable to load workout suggestions. Try again later.</p>}
      {state.status === 'ready' && state.data.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
      {state.status === 'ready' && state.data.suggestions.length > 0 && (
        <ul className="list-group">
          {state.data.suggestions.map((suggestion) => (
            <li className="list-group-item" key={suggestion.title}><strong>{suggestion.title}</strong> — {suggestion.reason}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
