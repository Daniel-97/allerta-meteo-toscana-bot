#!/usr/bin/env tsx
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante in .env");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
const command = process.argv[2];
const url = process.argv[3];

async function setWebhook(url: string) {
  const res = await fetch(`${api}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (data.ok) {
    console.log(`✅ Webhook impostato su ${url}`);
  } else {
    console.error(`❌ Errore: ${data.description}`);
    process.exit(1);
  }
}

async function deleteWebhook() {
  const res = await fetch(`${api}/deleteWebhook`, { method: "POST" });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (data.ok) {
    console.log("✅ Webhook eliminato. Puoi usare npm run dev (polling)");
  } else {
    console.error(`❌ Errore: ${data.description}`);
    process.exit(1);
  }
}

async function getWebhookInfo() {
  const res = await fetch(`${api}/getWebhookInfo`);
  const data = (await res.json()) as {
    ok: boolean;
    result: {
      url: string;
      pending_update_count: number;
      last_error_message?: string;
      last_error_date?: number;
    };
    description?: string;
  };
  if (!data.ok) {
    console.error(`❌ Errore: ${data.description}`);
    process.exit(1);
  }
  console.log("📡 Stato webhook:");
  console.log(`  URL: ${data.result.url || "(nessuno, usa polling)"}`);
  console.log(`  Update in coda: ${data.result.pending_update_count}`);
  if (data.result.last_error_message) {
    const date = data.result.last_error_date
      ? new Date(data.result.last_error_date * 1000).toLocaleString()
      : "?";
    console.log(`  Ultimo errore (${date}): ${data.result.last_error_message}`);
  }
}

switch (command) {
  case "set":
    if (!url) {
      console.error("Uso: npm run webhook -- set <url>");
      process.exit(1);
    }
    await setWebhook(url);
    break;
  case "delete":
    await deleteWebhook();
    break;
  case "info":
    await getWebhookInfo();
    break;
  default:
    console.log("Comandi disponibili:");
    console.log("  npm run webhook -- set <url>     Imposta webhook");
    console.log("  npm run webhook -- delete        Elimina webhook");
    console.log("  npm run webhook -- info          Stato webhook");
    break;
}
