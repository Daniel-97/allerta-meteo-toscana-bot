#!/usr/bin/env tsx
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN mancante in .env");
  process.exit(1);
}

const adminChatId = process.env.ADMIN_CHAT_ID;
if (!adminChatId) {
  console.error("❌ ADMIN_CHAT_ID mancante in .env");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
const command = process.argv[2];

interface BotCommand {
  command: string;
  description: string;
}

interface CommandScope {
  type: "default" | "chat";
  chat_id?: number;
}

const publicCommands: BotCommand[] = [
  { command: "start", description: "Avvia il bot" },
];

const adminCommands: BotCommand[] = [
  ...publicCommands,
  { command: "admin", description: "Pannello amministrazione" },
];

const defaultScope: CommandScope = { type: "default" };
const adminScope: CommandScope = { type: "chat", chat_id: Number(adminChatId) };

function scopeLabel(scope: CommandScope): string {
  return scope.type === "default" ? "default (tutti gli utenti)" : `chat admin (${scope.chat_id})`;
}

async function setCommandsForScope(scope: CommandScope, commands: BotCommand[]) {
  const res = await fetch(`${api}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands, scope }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (data.ok) {
    console.log(`✅ Comandi impostati per scope ${scopeLabel(scope)}: ${commands.map((c) => c.command).join(", ")}`);
  } else {
    console.error(`❌ Errore (${scopeLabel(scope)}): ${data.description}`);
    process.exit(1);
  }
}

async function deleteCommandsForScope(scope: CommandScope) {
  const res = await fetch(`${api}/deleteMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (data.ok) {
    console.log(`✅ Comandi eliminati per scope ${scopeLabel(scope)}`);
  } else {
    console.error(`❌ Errore (${scopeLabel(scope)}): ${data.description}`);
    process.exit(1);
  }
}

async function getCommandsForScope(scope: CommandScope) {
  const params = new URLSearchParams({ scope: JSON.stringify(scope) });
  const res = await fetch(`${api}/getMyCommands?${params}`);
  const data = (await res.json()) as {
    ok: boolean;
    result?: BotCommand[];
    description?: string;
  };
  if (!data.ok) {
    console.error(`❌ Errore (${scopeLabel(scope)}): ${data.description}`);
    process.exit(1);
  }
  console.log(`📋 Scope ${scopeLabel(scope)}:`);
  if (!data.result || data.result.length === 0) {
    console.log("  (nessun comando)");
  } else {
    for (const c of data.result) {
      console.log(`  /${c.command} — ${c.description}`);
    }
  }
}

switch (command) {
  case "set":
    await setCommandsForScope(defaultScope, publicCommands);
    await setCommandsForScope(adminScope, adminCommands);
    break;
  case "delete":
    await deleteCommandsForScope(defaultScope);
    await deleteCommandsForScope(adminScope);
    break;
  case "info":
  case "list":
    await getCommandsForScope(defaultScope);
    await getCommandsForScope(adminScope);
    break;
  default:
    console.log("Comandi disponibili:");
    console.log("  npm run commands -- set       Imposta i comandi (default + chat admin)");
    console.log("  npm run commands -- delete    Elimina i comandi (default + chat admin)");
    console.log("  npm run commands -- info      Mostra i comandi impostati");
    break;
}
