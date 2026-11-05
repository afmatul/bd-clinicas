/** Error con el mensaje para el usuario que devuelve la API. */
export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly campos: Record<string, string> = {}) {
    super(message);
  }
}

/** fetch contra /api con la cookie de sesión (httpOnly) y JSON. */
export async function api<T>(ruta: string, opciones: { method?: string; body?: unknown; query?: Record<string, unknown> } = {}): Promise<T> {
  const qs = opciones.query
    ? '?' + new URLSearchParams(Object.entries(opciones.query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
    : '';
  const res = await fetch(`/api${ruta}${qs}`, {
    method: opciones.method ?? 'GET',
    credentials: 'include',
    headers: opciones.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.mensaje ?? 'No pudimos conectar con el servidor. Intente de nuevo.', data.campos);
  }
  return data as T;
}
