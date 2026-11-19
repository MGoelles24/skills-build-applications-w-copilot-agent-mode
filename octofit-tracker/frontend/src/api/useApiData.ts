import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export type ApiState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

export function useApiData<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getJson<T>(path)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [path]);

  return state;
}
