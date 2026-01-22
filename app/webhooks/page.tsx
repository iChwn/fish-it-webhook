"use client";
import { useEffect, useState } from "react";

export default function WebhookViewer() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/webhooks");
    setData(await res.json());
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>Webhook Callback Viewer</h2>

      <h4>Last Payload</h4>
      <pre>{JSON.stringify(data?.lastPayload, null, 2)}</pre>

      <h4>Telegram Preview</h4>
      <pre>{data?.lastPreview}</pre>
    </div>
  );
}
