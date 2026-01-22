function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function stripDiscordMarkdown(s = "") {
  // minimal: buang bold **...** supaya rapih
  return String(s).replace(/\*\*/g, "");
}

export function toTelegramMessage(payload: any) {
  const embed = Array.isArray(payload?.embeds) ? payload.embeds[0] : {};
  const fields = Array.isArray(embed?.fields) ? embed.fields : [];

  const title = embed?.title || "🎣 New Catch";
  const bot = payload?.username || "";

  const footer = embed?.footer?.text || "";
  const desc = embed?.description || "";
  const thumb = embed?.thumbnail?.url || embed?.image?.url || "";

  // =========================
  // FALLBACK MODE (no fields)
  // =========================
  if (!fields.length) {
    const msg: string[] = [];

    msg.push(`<b>${escapeHtml(stripDiscordMarkdown(title))}</b>`);
    if (bot) msg.push(`<i>${escapeHtml(stripDiscordMarkdown(bot))}</i>`);

    if (desc) {
      msg.push("");
      msg.push(escapeHtml(stripDiscordMarkdown(desc)));
    }

    if (footer) {
      msg.push("");
      msg.push(`🧾 <i>${escapeHtml(stripDiscordMarkdown(footer))}</i>`);
    }

    // Optional: kalau mau tetep tulis link thumbnail (nanti di route.ts udah dihapus kalau sendPhoto)
    if (thumb) {
      msg.push("");
      msg.push(thumb);
    }

    let out = msg.join("\n").trim();
    if (out.length > 3900) out = out.slice(0, 3900) + "\n…";
    return out;
  }

  // =========================
  // FISH MODE (has fields)
  // =========================
  const get = (name: string) =>
    (fields.find((f: any) => (f?.name || "").toLowerCase() === name.toLowerCase())?.value || "")
      .toString()
      .trim();

  const user = stripDiscordMarkdown(get("User"));
  const fish = stripDiscordMarkdown(get("Fish Name"));
  const rarityRaw = stripDiscordMarkdown(get("Rarity"));
  const weight = stripDiscordMarkdown(get("Weight"));
  const mutation = stripDiscordMarkdown(get("Mutation"));
  const sell = stripDiscordMarkdown(get("Sell Price"));
  const backpack = stripDiscordMarkdown(get("Backpack"));

  const rarityMap: Record<string, string> = {
    common: "⚪ <b>COMMON</b>",
    uncommon: "🟢 <b>UNCOMMON</b>",
    rare: "🔵 <b>RARE</b>",
    legendary: "🟡 <b>LEGENDARY</b>",
    mythic: "🔴 <b>MYTHIC</b>",
    secret: "⚜️ <b>SECRET</b> ✨",
  };

  const rarity =
    rarityMap[(rarityRaw || "").toLowerCase()] ||
    (rarityRaw ? `❓ <b>${escapeHtml(rarityRaw)}</b>` : "");

  const msg: string[] = [];

  msg.push(`<b>${escapeHtml(stripDiscordMarkdown(title))}</b>`);
  if (bot) msg.push(`<i>${escapeHtml(stripDiscordMarkdown(bot))}</i>`);
  msg.push("");

  if (fish) msg.push(`🐟 <b>${escapeHtml(fish)}</b>`);
  if (rarity) msg.push(rarity);
  if (fish || rarity) msg.push("");

  const statsLine = [
    user && `👤 <code>${escapeHtml(user)}</code>`,
    weight && `⚖️ <code>${escapeHtml(weight)}</code>`,
    mutation && `🧬 <code>${escapeHtml(mutation)}</code>`,
  ]
    .filter(Boolean)
    .join("   ");

  if (statsLine) msg.push(statsLine);

  const econLine = [
    sell && `💰 <b>${escapeHtml(sell)}</b>`,
    backpack && `🎒 <code>${escapeHtml(backpack)}</code>`,
  ]
    .filter(Boolean)
    .join("   ");

  if (econLine) msg.push(econLine);

  if (footer) {
    msg.push("");
    msg.push(`🧾 <i>${escapeHtml(stripDiscordMarkdown(footer))}</i>`);
  }

  if (thumb) {
    msg.push("");
    msg.push(thumb);
  }

  let out = msg.join("\n").trim();
  if (out.length > 3900) out = out.slice(0, 3900) + "\n…";
  return out;
}
