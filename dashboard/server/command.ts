// Understands commands like "Go to Canada and find restaurants in Toronto" or "Toronto mein cafe dhundo".
// Uses Google's official Gemini SDK with a JSON schema, so the answer always has the same shape,
// and the answer is checked again against the same schema before it is used.
import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { HttpError } from './http';

export const CommandSchema = z.object({
  status: z.enum(['ready', 'needs_info', 'not_a_search']),
  business_type: z.string().nullable().describe('What kind of business, in plain English plural, lowercase, e.g. "cafes", "house painters", "hair salons". null if not given.'),
  city: z.string().nullable().describe('City in English, e.g. "Toronto". null if not given.'),
  country: z.string().nullable().describe('Country in English, e.g. "Canada". Infer from a well-known city when there is one obvious country; null if unknown.'),
  country_code: z.string().nullable().describe('ISO 3166-1 alpha-2 code in capitals, e.g. "CA". null if country is null.'),
  language: z.enum(['english', 'hindi', 'hinglish', 'other']),
  question: z.string().nullable().describe('If status is needs_info or not_a_search: one short, friendly question in the SAME language and script the owner used. Otherwise null.'),
  summary: z.string().describe('Short English confirmation of what will be searched, e.g. "Cafes in Tokyo, Japan".'),
});
export type ParsedCommand = z.infer<typeof CommandSchema>;

const SYSTEM = `You read search commands for LeadPilot, a tool that finds local businesses on Google Maps for a web designer.
The owner types or speaks in English, Hindi, or Hinglish (Hindi written in Latin letters, e.g. "Toronto mein cafe dhundo" = "find cafes in Toronto").
Extract three things: business type, city, country.
- status "ready" only when business type AND city are both clear and the country is known or obvious from the city.
- If the city exists in several countries and none is obvious (e.g. "Hyderabad" could be India or Pakistan — India is the usual meaning; "London" usually means the UK), pick the most common meaning and say it in the summary; the owner confirms before anything runs.
- If anything required is missing or unclear, use status "needs_info" and ask ONE short question for what is missing, in the owner's language and script.
- If the message is not a request to find businesses, use status "not_a_search" and briefly say what LeadPilot can do, in the owner's language.
- Fix obvious speech-to-text slips (e.g. "Tokyo mein content cafe" most likely means "cafe"; keep the owner's words when unsure and mention it in the question).
- Never invent a city or business type the owner did not say.`;

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'; // stable model (not preview)
/**
 * Gemini supports only part of JSON Schema (its documented list includes type, enum, anyOf, properties, required…).
 * Drop the `$schema` header and write "string or null" as anyOf instead of a type array.
 */
export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== 'object') return node;
  const { $schema: _drop, ...rest } = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) out[k] = toGeminiSchema(v);
  if (Array.isArray(out.type)) {
    const { type, ...others } = out;
    return { ...others, anyOf: (type as string[]).map((t) => ({ type: t })) };
  }
  return out;
}
const RESPONSE_SCHEMA = toGeminiSchema(z.toJSONSchema(CommandSchema));

export async function parseCommand(apiKey: string, text: string): Promise<ParsedCommand> {
  const ai = new GoogleGenAI({ apiKey });
  let raw: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: text,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0,
        abortSignal: AbortSignal.timeout(30_000),
      },
    });
    raw = response.text;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 400 && /api key/i.test(e.message)) throw new HttpError(502, 'The Gemini API key is not valid. Update GEMINI_API_KEY in Cloudflare.', 'ai_auth');
      if (e.status === 401 || e.status === 403) throw new HttpError(502, 'The Gemini API key was refused. Check it in Google AI Studio.', 'ai_auth');
      if (e.status === 429) throw new HttpError(429, 'Gemini is busy or the free limit was reached. Try again in a minute.', 'ai_busy');
      throw new HttpError(502, `Gemini returned an error (${e.status}).`, 'ai_error');
    }
    throw new HttpError(502, 'Could not reach Gemini. Try again in a minute.', 'ai_unreachable');
  }
  return parseModelJson(raw);
}

/** The model's text must be valid JSON matching the schema — otherwise nothing runs. */
export function parseModelJson(raw: string | undefined): ParsedCommand {
  let data: unknown;
  try {
    data = JSON.parse(raw ?? '');
  } catch {
    throw new HttpError(422, 'LeadPilot could not understand that command. Try: "Find painters in Vancouver".', 'not_understood');
  }
  const parsed = CommandSchema.safeParse(data);
  if (!parsed.success) throw new HttpError(422, 'LeadPilot could not understand that command. Try: "Find painters in Vancouver".', 'not_understood');
  return normaliseCommand(parsed.data);
}

/** Server-side safety net on top of the schema: tidy values, and never "ready" with a missing piece. */
export function normaliseCommand(c: ParsedCommand): ParsedCommand {
  const clean = (v: string | null) => (v && v.trim() ? v.trim().slice(0, 80) : null);
  const out: ParsedCommand = {
    ...c,
    business_type: clean(c.business_type)?.toLowerCase() ?? null,
    city: clean(c.city),
    country: clean(c.country),
    country_code: c.country_code && /^[A-Za-z]{2}$/.test(c.country_code.trim()) ? c.country_code.trim().toUpperCase() : null,
  };
  if (out.status === 'ready' && (!out.business_type || !out.city || !out.country || !out.country_code)) {
    out.status = 'needs_info';
    out.question = out.question ?? (!out.business_type ? 'What type of business should I look for?' : !out.city ? 'Which city should I search in?' : 'Which country is that city in?');
  }
  return out;
}

export function buildPlacesQuery(c: Pick<ParsedCommand, 'business_type' | 'city' | 'country'>): string {
  return `${c.business_type} in ${c.city}, ${c.country}`;
}
