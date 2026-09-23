export class ApiError extends Error {
  data: Record<string, unknown>;
  constructor(message: string, data: Record<string, unknown>) {
    super(message);
    this.data = data;
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Error ${res.status}`, body);
  }
  if (res.status === 204) return null;
  return res.json();
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
