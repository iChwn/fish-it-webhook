"use client";

import { useEffect, useState } from "react";

export default function Preview() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/webhooks", { cache: "no-store" });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, []);

  const previewText = data?.previewText ?? "";
  const payload = data?.body ?? null;
  const thumb = payload?.embeds?.[0]?.thumbnail?.url || payload?.embeds?.[0]?.image?.url || payload?.thumbnail?.url || "";

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "sans-serif", color: "#FFF" }}>
      <h1>Preview (Last Webhook)</h1>

      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16 }}>
        <div>
          <h3>Last Payload</h3>
          <pre
            style={{
              background: "#948979",
              padding: 10,
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 500,      // 🔽 dipendekin
              fontSize: 11,        // 🔽 diperkecil
              lineHeight: 1.4,
            }}
          >
            {payload ? JSON.stringify(payload, null, 2) : "Belum ada payload masuk."}
          </pre>
        </div>

        <div>
          <h3>Telegram Preview Text</h3>
          <pre style={{ background: "#111", color: "#eee", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", minHeight: 200 }}>
            {previewText || "Belum ada preview."}
          </pre>

          <h3 style={{ marginTop: 16 }}>Rendered (approx)</h3>
          <div style={{ background: "#000", padding: 12, borderRadius: 8, minHeight: 200 }}>
            <div dangerouslySetInnerHTML={{ __html: (previewText || "").replaceAll("\n", "<br/>") }} />
            {thumb ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Thumbnail</div>
                <img
                  src={thumb}
                  alt="thumbnail"
                  style={{ maxWidth: 220, borderRadius: 12, display: "block" }}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Updated: {data?.received_at || "-"}
      </div>
    </div>
  );
}
