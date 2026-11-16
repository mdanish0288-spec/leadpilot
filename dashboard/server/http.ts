import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
  console.error(e);
  return json({ error: 'Something went wrong on the server. Nothing was changed.', code: 'server_error' }, 500);
}

export function bearer(request: Request): string {
  const h = request.headers.get('Authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(h);
  if (!m) throw new HttpError(401, 'Please sign in again.', 'not_signed_in');
  return m[1];
}

/** Talks to Supabase AS THE SIGNED-IN OWNER, so Row Level Security (owner + 2FA) always applies. */
export class Db {
  // Wrapped in an arrow: Cloudflare's runtime throws "Illegal invocation" if fetch is called as a method of another object.
  constructor(private token: string, private fetcher: typeof fetch = (input, init) => fetch(input, init)) {}

  private headers(extra: Record<string, string> = {}) {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...extra };
  }

  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const r = await this.fetcher(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(args) });
    if (r.status === 401) throw new HttpError(401, 'Please sign in again.', 'not_signed_in');
    if (!r.ok) throw new HttpError(502, `Database call ${fn} failed.`, 'db_error');
    return (await r.json()) as T;
  }

  async select<T>(pathAndQuery: string): Promise<T[]> {
    const r = await this.fetcher(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: this.headers() });
    if (r.status === 401) throw new HttpError(401, 'Please sign in again.', 'not_signed_in');
    if (!r.ok) throw new HttpError(502, 'Could not read from the database.', 'db_error');
    return (await r.json()) as T[];
  }

  /** With `ignoreDuplicates`, rows that clash with a unique key are skipped and NOT returned. */
  async insert<T>(table: string, rows: unknown[], query = '', ignoreDuplicates = false): Promise<T[]> {
    const prefer = ignoreDuplicates ? 'resolution=ignore-duplicates,return=representation' : 'return=representation';
    const r = await this.fetcher(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method: 'POST', headers: this.headers({ Prefer: prefer }), body: JSON.stringify(rows),
    });
    if (!r.ok) throw new HttpError(502, `Could not save to ${table}: ${await r.text()}`, 'db_error');
    return (await r.json()) as T[];
  }

  async update(table: string, filter: string, patch: Record<string, unknown>): Promise<void> {
    const r = await this.fetcher(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH', headers: this.headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch),
    });
    if (!r.ok) throw new HttpError(502, `Could not update ${table}.`, 'db_error');
  }
}

/** Owner + 2FA check, hourly rate limit and usage record — all in one database call. */
export async function requireOwner(db: Db, kind: 'command' | 'search' | 'transcribe' | 'website_check' | 'import' | 'reply', maxPerHour: number) {
  const result = await db.rpc<string>('use_quota', { p_kind: kind, p_max_per_hour: maxPerHour });
  if (result === 'not_owner') throw new HttpError(403, 'Only the owner, signed in with 2FA, can do this.', 'not_owner');
  if (result === 'rate_limited') throw new HttpError(429, `Hourly limit reached for ${kind.replace('_', ' ')}. Try again later.`, 'rate_limited');
  if (result !== 'ok') throw new HttpError(502, 'Could not check your access.', 'db_error');
}

/** Retry once on network/5xx errors (hard rule: retry once, then stop and report). */
export async function fetchRetryOnce(input: string, init: RequestInit, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    const r = await fetcher(input, init);
    if (r.status < 500 && r.status !== 429) return r;
  } catch { /* fall through to the single retry */ }
  return fetcher(input, init);
}
