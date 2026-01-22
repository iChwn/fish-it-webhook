import { promises as fs } from "fs";
import path from "path";
import { toTelegramMessage } from "@/lib/formatTelegram";

export const runtime = "nodejs";

const STORE_PATH = path.join(process.cwd(), ".webhook_last.json");

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("application/json")) return await req.json().catch(() => null);

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

export async function POST(req: Request) {
  const body = await readBody(req);

  const previewText = body ? toTelegramMessage(body) : "";

  const data = {
    received_at: new Date().toISOString(),
    body,
    previewText,
  };

  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");

  return Response.json({ ok: true, saved: true });
}

export async function GET() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return new Response(raw, { headers: { "Content-Type": "application/json" } });
  } catch {
    return Response.json({ ok: true, body: null, previewText: "" });
  }
}
