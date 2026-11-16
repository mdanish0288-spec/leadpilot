// Code-level safety check on every AI-suggested reply (the AI is never trusted alone).

const PAYMENT_DETAILS = /\bupi\b|@ok|@ybl|@paytm|paypal|usdt|wallet address|bank account|ifsc|account number/i;
const URGENCY = /only today|limited time|last chance|hurry|offer ends|expires today/i;

/** Any amount in the reply must be one of the allowed prices. Payment details and fake urgency are never allowed. */
export function checkReply(text: string, allowedPrices: number[]): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (PAYMENT_DETAILS.test(text)) warnings.push('Contains payment details — only you can send those, after the client clearly agrees.');
  if (URGENCY.test(text)) warnings.push('Contains fake urgency.');
  const amounts = [...text.matchAll(/(?:₹|rs\.?|inr|\$|usd)\s?([\d,]+(?:\.\d+)?)/gi)].map((m) => Number(m[1].replace(/,/g, '')));
  for (const a of amounts) if (!allowedPrices.includes(a)) warnings.push(`Mentions an amount (${a.toLocaleString('en-IN')}) that is not your listed price.`);
  return { ok: warnings.length === 0, warnings };
}
