import { useApiData } from '../api/useApiData.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const state = useApiData<{ leaderboard: Entry[] }>('/api/leaderboard');

  return (
    <section>
      <h2 className="h4">Leaderboard</h2>
      <p>Compare team point totals.</p>
      {state.status === 'loading' && <p role="status">Loading leaderboard…</p>}
      {state.status === 'error' && <p role="alert">Unable to load the leaderboard. Try again later.</p>}
      {state.status === 'ready' && state.data.leaderboard.length === 0 && <p>No leaderboard entries yet.</p>}
      {state.status === 'ready' && state.data.leaderboard.length > 0 && (
        <ol className="list-group list-group-numbered">
          {state.data.leaderboard.map((entry) => (
            <li className="list-group-item" key={entry.rank}>{`${entry.teamName} · ${entry.totalPoints} points`}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
