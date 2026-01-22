import { toTelegramMessage } from "@/lib/formatTelegram";

export const runtime = "nodejs";

// dedupe 60 detik (optional)
const seen = new Map<string, number>();
function isDuplicate(key: string) {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 60_000) seen.delete(k);
  if (!key) return false;
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

// baca body: JSON / form-data / urlencoded
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

  // fallback
  const raw = await req.text().catch(() => "");
  return raw ? { _raw: raw } : null;
}

export async function POST(req: Request) {
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

  const text = toTelegramMessage(body);

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true, // kalau mau link preview, set false
      }),
    });

    if (!tgRes.ok) {
      const raw = await tgRes.text().catch(() => "");
      return Response.json(
        { ok: false, error: "Telegram API failed", status: tgRes.status, raw },
        { status: 502 }
      );
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "Fetch failed", message: String(e?.message || e) },
      { status: 502 }
    );
  }
}

export async function GET() {
  return Response.json({ ok: true, message: "telegram webhooks endpoint hidup" });
}
