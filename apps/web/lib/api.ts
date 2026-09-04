const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('aquasense.token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem('aquasense.token');
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      throw new Error(message || text || res.statusText);
    } catch (error) {
      if (error instanceof Error && error.message !== text) throw error;
      throw new Error(text || res.statusText);
    }
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiUrl = BASE;
