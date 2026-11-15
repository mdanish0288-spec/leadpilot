// POST /api/transcribe  (form-data: audio) → { text, language_code }  via ElevenLabs Scribe.
// The text is shown to the owner to confirm BEFORE anything runs.
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, fetchRetryOnce, HttpError, json, requireOwner } from '../../server/http';

const MAX_BYTES = 10 * 1024 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'transcribe', 60);
    if (!env.ELEVENLABS_API_KEY) throw new HttpError(503, 'Voice input is not set up yet (ElevenLabs key missing).', 'not_configured');
    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size === 0) throw new HttpError(400, 'No recording received.', 'no_audio');
    if (audio.size > MAX_BYTES) throw new HttpError(400, 'Recording is too long. Keep it under 1 minute.', 'too_big');

    const out = new FormData();
    out.append('model_id', 'scribe_v2');
    out.append('file', audio, audio.name || 'command.webm');
    out.append('tag_audio_events', 'false');
    const r = await fetchRetryOnce('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, body: out });
    if (!r.ok) {
      console.error('ElevenLabs error', r.status, (await r.text()).slice(0, 300));
      throw new HttpError(502, r.status === 401 ? 'The ElevenLabs key is not valid.' : 'Could not turn the recording into text. Try again or type it.', 'stt_error');
    }
    const data = (await r.json()) as { text?: string; language_code?: string };
    return json({ text: (data.text ?? '').trim(), language_code: data.language_code ?? null });
  } catch (e) {
    return errorResponse(e);
  }
};
