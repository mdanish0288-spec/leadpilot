// GET /api/status — which services are connected (yes/no only; secrets are never sent to the browser).
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json } from '../../server/http';
import { parseServiceAccount } from '../../server/sheet';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    const [settings] = await db.select<{ google_sheet_id: string }>('settings?select=google_sheet_id&id=eq.1');
    if (!settings) throw new HttpError(403, 'Only the owner, signed in with 2FA, can do this.', 'not_owner');
    const sa = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return json({
      claude: !!env.ANTHROPIC_API_KEY,
      places: !!env.GOOGLE_PLACES_API_KEY,
      voice: !!env.ELEVENLABS_API_KEY,
      sheet_key: !!sa,
      sheet_link: !!settings.google_sheet_id,
      service_account_email: sa?.client_email ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
};
