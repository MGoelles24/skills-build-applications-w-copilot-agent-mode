import { useApiData } from '../api/useApiData.js';

type Team = { name: string; mascot?: string; members: unknown[] };

export default function Teams() {
  const state = useApiData<{ teams: Team[] }>('/api/teams');

  return (
    <section>
      <h2 className="h4">Teams</h2>
      <p>Manage teams and members.</p>
      {state.status === 'loading' && <p role="status">Loading teams…</p>}
      {state.status === 'error' && <p role="alert">Unable to load teams. Try again later.</p>}
      {state.status === 'ready' && state.data.teams.length === 0 && <p>No teams yet.</p>}
      {state.status === 'ready' && state.data.teams.length > 0 && (
        <ul className="list-group">
          {state.data.teams.map((team, index) => (
            <li className="list-group-item" key={index}>{`${team.name} · ${team.members.length} members`}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
