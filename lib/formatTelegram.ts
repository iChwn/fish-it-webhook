// lib/formatTelegram.ts

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function toTelegramMessage(payload: any) {
  const embed = Array.isArray(payload?.embeds) ? payload.embeds[0] : {};
  const fields = Array.isArray(embed?.fields) ? embed.fields : [];

  const get = (name: string) =>
    (
      fields.find(
        (f: any) => (f?.name || "").toLowerCase() === name.toLowerCase()
      )?.value || ""
    )
      .toString()
      .replace(/\*\*/g, "") // buang bold markdown discord
      .trim();

  const title = embed?.title || "🎣 New Fish";
  const bot = payload?.username || "";

  const user = get("User");
  const fish = get("Fish Name");
  const rarityRaw = get("Rarity");
  const weight = get("Weight");
  const mutation = get("Mutation");
  const sell = get("Sell Price");
  const backpack = get("Backpack");
  const footer = embed?.footer?.text || "";
  const thumb = embed?.thumbnail?.url || "";

  const rarityMap: Record<string, string> = {
    common: "⚪ <b>COMMON</b>",
    uncommon: "🟢 <b>UNCOMMON</b>",
    rare: "🔵 <b>RARE</b>",
    legendary: "🟡 <b>LEGENDARY</b>",
    mythic: "🔴 <b>MYTHIC</b>",
    secret: "⚜️ <b>SECRET</b> ✨",
  };

  const rarity =
    rarityMap[rarityRaw.toLowerCase()] ||
    `❓ <b>${escapeHtml(rarityRaw)}</b>`;

  const msg: string[] = [];

  // Header
  msg.push(`<b>${escapeHtml(title)}</b>`);
  if (bot) msg.push(`<i>${escapeHtml(bot)}</i>`);
  msg.push("");

  // Fish info
  msg.push(`🐟 <b>${escapeHtml(fish)}</b>`);
  msg.push(rarity);
  msg.push("");

  // Stats line
  msg.push(
    [
      user && `👤 <code>${escapeHtml(user)}</code>`,
      weight && `⚖️ <code>${escapeHtml(weight)}</code>`,
      mutation && `🧬 <code>${escapeHtml(mutation)}</code>`,
    ]
      .filter(Boolean)
      .join("   ")
  );

  // Economy line
  msg.push(
    [
      sell && `💰 <b>${escapeHtml(sell)}</b>`,
      backpack && `🎒 <code>${escapeHtml(backpack)}</code>`,
    ]
      .filter(Boolean)
      .join("   ")
  );

  // Footer
  if (footer) {
    msg.push("");
    msg.push(`🧾 <i>${escapeHtml(footer)}</i>`);
  }

  // Thumbnail (Telegram bakal preview otomatis)
  if (thumb) {
    msg.push("");
    msg.push(thumb);
  }

  let out = msg.join("\n").trim();

  // Safety limit Telegram
  if (out.length > 3900) out = out.slice(0, 3900) + "\n…";

  return out;
}
