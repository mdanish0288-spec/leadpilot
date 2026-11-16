// Calls LeadPilot's own server (/api/*) with the owner's sign-in token.
import { supabase } from './supabase';
import { PREVIEW } from './data';

export class ApiError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError('Please sign in again.', 'not_signed_in', 401);
  return data.session.access_token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (PREVIEW) return previewResponse(path) as T;
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}` };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError('No internet connection, or LeadPilot could not be reached.', 'offline', 0);
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${r.status}).`, (data as { code?: string }).code ?? 'error', r.status);
  return data as T;
}

export interface ParsedCommand {
  status: 'ready' | 'needs_info' | 'not_a_search';
  business_type: string | null; city: string | null; country: string | null; country_code: string | null;
  language: string; question: string | null; summary: string;
}
export interface SheetResult { ok: boolean; rows?: number; reason?: string }
export interface SearchResult { search_id: string; source: 'google' | 'openstreetmap'; fallback_reason: string | null; usable: number; found: number; new_leads: number; duplicates: number; hot: number; checking: number; more_available: boolean; sheet: SheetResult }
export interface CheckResult { checked: number; remaining: boolean; sheet: SheetResult }
export interface Status { ai: boolean; places: boolean; voice: boolean; sheet_key: boolean; sheet_link: boolean; service_account_email: string | null }

export const api = {
  status: () => call<Status>('/api/status'),
  command: (text: string) => call<ParsedCommand>('/api/command', { method: 'POST', body: JSON.stringify({ text }) }),
  transcribe: (audio: Blob) => {
    const f = new FormData();
    f.append('audio', audio, 'command.webm');
    return call<{ text: string; language_code: string | null }>('/api/transcribe', { method: 'POST', body: f });
  },
  search: (body: Record<string, unknown>) => call<SearchResult>('/api/search', { method: 'POST', body: JSON.stringify(body) }),
  checkWebsites: () => call<CheckResult>('/api/check-websites', { method: 'POST', body: '{}' }),
  syncSheet: () => call<{ added: number; remaining: boolean; sheet: SheetResult }>('/api/sync-sheet', { method: 'POST', body: '{}' }),
};

/** Processes every pending website check, a few at a time. Safe to call more than once. */
export async function runWebsiteChecks(onProgress?: (checkedSoFar: number) => void): Promise<{ checked: number; sheetProblem: string | null }> {
  let total = 0;
  let sheetProblem: string | null = null;
  for (let i = 0; i < 40; i++) {
    const r = await api.checkWebsites();
    total += r.checked;
    if (!r.sheet.ok) sheetProblem = r.sheet.reason ?? 'Google Sheet update failed.';
    onProgress?.(total);
    if (!r.remaining || r.checked === 0) break;
  }
  return { checked: total, sheetProblem };
}

// ---- local preview (dev only) ----
function previewResponse(path: string): unknown {
  if (path === '/api/status') return { ai: true, places: true, voice: true, sheet_key: false, sheet_link: false, service_account_email: 'leadpilot-sheets@your-project.iam.gserviceaccount.com' };
  if (path === '/api/command') return { status: 'ready', business_type: 'cafes', city: 'Tokyo', country: 'Japan', country_code: 'JP', language: 'hinglish', question: null, summary: 'Cafes in Tokyo, Japan' };
  if (path === '/api/search') return { search_id: 'preview', source: 'google', fallback_reason: null, usable: 20, found: 20, new_leads: 17, duplicates: 3, hot: 9, checking: 8, more_available: true, sheet: { ok: false, reason: 'Google Sheet link is not set in Settings yet.' } };
  if (path === '/api/check-websites') return { checked: 8, remaining: false, sheet: { ok: true, rows: 0 } };
  return {};
}
