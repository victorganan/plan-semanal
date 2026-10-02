export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? res.statusText ?? 'Error', res.status, body);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Para mostrar el motivo real de un fallo (código + mensaje del servidor)
// en vez de un texto genérico (petición explícita tras el fallo sin
// explicar de "eliminar tarea delegada"). `fallback` cubre errores de red
// (fetch ni siquiera llegó al servidor), donde no hay código que mostrar.
export function describeApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${err.message} (código ${err.status})`;
  return fallback;
}

export const api = {
  get: (url: string) => fetch(url).then(handle),
  post: (url: string, data?: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }).then(handle),
  patch: (url: string, data: unknown) =>
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle),
  delete: (url: string, data?: unknown) =>
    fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }).then(handle),
};
