import { toTelegramMessage } from "@/lib/formatTelegram";

export const runtime = "nodejs";

// =====================
// DEDUPE (optional)
// =====================
const seen = new Map<string, number>();
function isDuplicate(key: string) {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 60_000) seen.delete(k);
  if (!key) return false;
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

// =====================
// BODY PARSER (JSON / form-data / urlencoded)
// =====================
async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    return await req.json().catch(() => null);
  }

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }

  const raw = await req.text().catch(() => "");
  return raw ? { _raw: raw } : null;
}

// =====================
// HELPERS
// =====================
function getThumbUrl(payload: any): string {
  return (
    payload?.embeds?.[0]?.thumbnail?.url ||
    payload?.embeds?.[0]?.image?.url ||
    payload?.thumbnail?.url ||
    ""
  );
}

// Telegram caption limit (umumnya 1024 untuk photo caption)
function trimTelegramCaption(s: string, max = 1024) {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max - 2) + "…";
}

// Karena formatter kamu sebelumnya mungkin nambahin URL thumb di akhir,
// kita buang biar gak dobel (caption + foto udah cukup).
function removeTrailingThumbLine(text: string, thumb: string) {
  if (!text) return text;
  if (!thumb) return text;

  const lines = text.split("\n");
  const last = (lines[lines.length - 1] || "").trim();
  const secondLast = (lines[lines.length - 2] || "").trim();

  // kasus: thumb ada di baris terakhir
  if (last === thumb) {
    lines.pop();
    // buang juga 1 baris kosong sebelum link kalau ada
    if (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    return lines.join("\n").trim();
  }

  // kadang link kepotong/ada spasi? minimal cek contains
  if (last.includes(thumb)) {
    lines.pop();
    if (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    return lines.join("\n").trim();
  }

  // jika link ada di secondLast dan last kosong
  if (secondLast === thumb && last === "") {
    lines.pop();
    lines.pop();
    if (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    return lines.join("\n").trim();
  }

  return text;
}

// =====================
// TELEGRAM SENDERS
// =====================
async function tgSendPhoto(token: string, chatId: string, photoUrl: string, caption: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`sendPhoto failed: ${res.status} ${raw}`);
  }
}

async function tgSendMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`sendMessage failed: ${res.status} ${raw}`);
  }
}

// =====================
// ROUTE
// =====================
export async function POST(req: Request) {
  // Optional secret check (kalau mau amankan endpoint)
  // const expected = process.env.WEBHOOK_SECRET || "";
  // const secret = new URL(req.url).searchParams.get("secret") || "";
  // if (expected && secret !== expected) {
  //   return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  // }

  const body = await readBody(req);

  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const requestId =
    req.headers.get("x_request_id") ||
    req.headers.get("x-request-id") ||
    "";

  if (requestId && isDuplicate(requestId)) {
    return Response.json({ ok: true, duplicate: true }, { status: 200 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Response.json(
      { ok: false, error: "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID" },
      { status: 500 }
    );
  }

  const thumb = getThumbUrl(body);

  // text dari formatter
  let text = toTelegramMessage(body);

  // buang baris link thumbnail dari text (karena kita kirim foto)
  text = removeTrailingThumbLine(text, thumb);

  // caption dipotong biar gak kena limit caption
  const caption = trimTelegramCaption(text || " ");

  try {
    if (thumb) {
      await tgSendPhoto(token, chatId, thumb, caption || " ");
    } else {
      await tgSendMessage(token, chatId, text || "Webhook received");
    }

    return Response.json({ ok: true, sent: true }, { status: 200 });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "Telegram forward failed", message: String(e?.message || e) },
      { status: 502 }
    );
  }
}

export async function GET() {
  return Response.json({ ok: true, message: "api/telegram/webhooks hidup" });
}
