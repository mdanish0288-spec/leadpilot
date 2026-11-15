// Secrets live ONLY in Cloudflare Pages → Settings → Variables and Secrets (encrypted).
// They are never in code or GitHub.
export interface Env {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  /** Full JSON key of the Google service account that edits the "LeadPilot Leads" sheet. */
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
}

export const SUPABASE_URL = 'https://hqmhqrbmpxrksvnqmtlg.supabase.co';
// Public by design (same key the browser uses). Every table is protected by RLS: owner + 2FA.
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3coQaB8y5KRlEAZ3UUlsHg_6rf5NkLQ';
