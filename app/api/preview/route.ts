import { toTelegramMessage } from "@/lib/formatTelegram";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const text = toTelegramMessage(body);

  return Response.json({
    ok: true,
    text,            // versi "HTML Telegram"
    lines: text.split("\n"), // enak buat debug
  });
}
