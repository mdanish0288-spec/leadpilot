// POST /api/suggest-reply { lead_id, client_message } → a suggested answer the OWNER approves and sends.
// Nothing is sent automatically. The client message is logged. Code double-checks the AI's answer.
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Env } from '../../server/env';
import { Db, bearer, errorResponse, HttpError, json, requireOwner } from '../../server/http';
import { checkReply } from '../../server/reply';
import { GEMINI_MODEL, toGeminiSchema } from '../../server/command';

const Out = z.object({
  reply: z.string().describe("The message to send back, in the client's language and script, warm and short."),
  needs_owner: z.boolean().describe('true if the owner must handle this personally'),
  reason: z.string().describe('One short line for the owner: what the client wants / why owner is needed'),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = new Db(bearer(request));
    await requireOwner(db, 'reply', 120);
    if (!env.GEMINI_API_KEY) throw new HttpError(503, 'Gemini API key is not set up yet.', 'not_configured');
    const { lead_id, client_message } = (await request.json().catch(() => ({}))) as { lead_id?: string; client_message?: string };
    const msg = typeof client_message === 'string' ? client_message.trim().slice(0, 2000) : '';
    if (!lead_id || !msg) throw new HttpError(400, 'Paste the message the business sent you.', 'empty');

    const [lead] = await db.select<{ id: string; name: string; country_code: string | null; pricing_tier: string | null; demo_link: string | null; stage: string }>(`leads?id=eq.${encodeURIComponent(lead_id)}&select=id,name,country_code,pricing_tier,demo_link,stage`);
    if (!lead) throw new HttpError(404, 'Lead not found.', 'not_found');
    const [s] = await db.select<{ owner_name: string; business_name: string; services_included: string; delivery_days: number; advance_percent: number; free_change_rounds: number }>('settings?id=eq.1&select=owner_name,business_name,services_included,delivery_days,advance_percent,free_change_rounds');
    const region = lead.country_code === 'IN' ? 'IN' : 'INTL';
    const [tier] = await db.select<{ currency: string; start_price: number; lowest_price: number }>(`price_tiers?region=eq.${region}&tier=eq.${lead.pricing_tier ?? 'standard'}&select=currency,start_price,lowest_price`);
    const history = await db.select<{ direction: string; body: string }>(`messages?lead_id=eq.${lead.id}&order=created_at.asc&limit=12&select=direction,body`);
    await db.insert('messages', [{ lead_id: lead.id, channel: 'whatsapp', direction: 'in', body: msg }]);

    const price = tier ? `${tier.currency === 'INR' ? '₹' : '$'}${Number(tier.start_price).toLocaleString('en-IN')}` : null;
    const system = `You help ${s.owner_name}${s.business_name ? ` (${s.business_name})` : ''}, a web designer, reply to "${lead.name}", a small business that received a free demo website${lead.demo_link ? ` (${lead.demo_link})` : ''}.
Write the reply ${s.owner_name} will send. Same language and script as the client (English, Hindi or Hinglish). Short, warm, professional. Never invent facts.
What is included: ${s.services_included}. Delivery: about ${s.delivery_days} days after the advance. Payment terms: ${s.advance_percent}% advance to start, the rest when the website is ready. ${s.free_change_rounds} free change round(s) before payment.
Price: only if the client asks, quote exactly ${price ?? 'nothing — set needs_owner'} (includes first-year domain). Never offer a lower price or discount yourself.
NEVER include payment details (UPI, PayPal, bank, wallet) — the owner adds those after the client clearly agrees.
Set needs_owner=true if: the client is angry or complaining, asks for a discount or a lower price, mentions legal issues/contracts, wants a big custom project, says they paid, clearly agrees to buy, asks something not covered above, or you are unsure. Still draft a polite holding reply.
If they want changes, ask them to send their photos and list the changes. If they want a call, ask for a good day and time.`;
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [...history.map((h) => ({ role: h.direction === 'out' ? 'model' : 'user', parts: [{ text: h.body }] })), { role: 'user', parts: [{ text: msg }] }],
      config: { systemInstruction: system, responseMimeType: 'application/json', responseJsonSchema: toGeminiSchema(z.toJSONSchema(Out)), temperature: 0.3, abortSignal: AbortSignal.timeout(30_000) },
    }).catch(() => { throw new HttpError(502, 'Gemini could not answer right now. Try again in a minute.', 'ai_error'); });
    const parsed = Out.safeParse(JSON.parse(res.text ?? '{}'));
    if (!parsed.success) throw new HttpError(502, 'Gemini gave an unclear answer. Try again.', 'ai_error');
    const check = checkReply(parsed.data.reply, tier ? [Number(tier.start_price)] : []);
    return json({ ...parsed.data, needs_owner: parsed.data.needs_owner || !check.ok, warnings: check.warnings });
  } catch (e) {
    return errorResponse(e);
  }
};
