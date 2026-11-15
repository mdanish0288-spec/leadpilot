// POST /api/command  { text } → what to search (business type, city, country) or one follow-up question.
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json, requireOwner } from '../../server/http';
import { parseCommand } from '../../server/command';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'command', 120);
    if (!env.GEMINI_API_KEY) throw new HttpError(503, 'Gemini API key is not set up yet.', 'not_configured');
    const body = (await request.json().catch(() => ({}))) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) throw new HttpError(400, 'Type or say what to find, e.g. "Find painters in Vancouver".', 'empty');
    if (text.length > 500) throw new HttpError(400, 'Please keep the command under 500 characters.', 'too_long');
    return json(await parseCommand(env.GEMINI_API_KEY, text));
  } catch (e) {
    return errorResponse(e);
  }
};
