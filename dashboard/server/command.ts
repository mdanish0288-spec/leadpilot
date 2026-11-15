// Understands commands like "Go to Canada and find restaurants in Toronto" or "Toronto mein cafe dhundo".
// Uses the official Anthropic SDK with structured outputs, so the answer always has the same shape.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
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

export async function parseCommand(apiKey: string, text: string): Promise<ParsedCommand> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });
  let response;
  try {
    response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(CommandSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: text }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(502, 'The Claude API key is not valid. Update it in Cloudflare.', 'claude_auth');
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude is busy right now. Try again in a minute.', 'claude_busy');
    if (e instanceof Anthropic.APIConnectionError || e instanceof Anthropic.InternalServerError) throw new HttpError(502, 'Could not reach Claude. Try again in a minute.', 'claude_unreachable');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `Claude returned an error (${e.status}).`, 'claude_error');
    throw e;
  }
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new HttpError(422, 'LeadPilot could not understand that command. Try: "Find painters in Vancouver".', 'not_understood');
  }
  return normaliseCommand(response.parsed_output);
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
