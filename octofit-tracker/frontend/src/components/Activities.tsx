import { useApiData } from '../api/useApiData.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const state = useApiData<{ activities: Activity[] }>('/api/activities');

  return (
    <section>
      <h2 className="h4">Activities</h2>
      <p>Track student activity minutes and points.</p>
      {state.status === 'loading' && <p role="status">Loading activities…</p>}
      {state.status === 'error' && <p role="alert">Unable to load activities. Try again later.</p>}
      {state.status === 'ready' && state.data.activities.length === 0 && <p>No activities yet.</p>}
      {state.status === 'ready' && state.data.activities.length > 0 && (
        <ul className="list-group">
          {state.data.activities.map((activity, index) => (
            <li className="list-group-item" key={index}>{`${activity.type} · ${activity.minutes} min · ${activity.points} points`}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
