import type { User } from "../../services/users.js";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const adminMessages = {
  welcome:
    "👑 <b>Pannello Admin</b>\n\n" +
    "/admin — Mostra questo messaggio\n" +
    "/admin_stat — Statistiche utenti\n" +
    "/admin_utenti — Elenco utenti registrati\n" +
    "/admin_info &lt;id&gt; — Info su un utente\n" +
    "/admin_broadcast &lt;testo&gt; — Invia messaggio a tutti gli utenti",

  riepilogoUtenti: (totale: number, comuniTotali: number) =>
    `👥 <b>Utenti registrati:</b> ${totale}\n📍 <b>Comuni seguiti:</b> ${comuniTotali}`,

  listaUtenti: (users: { idTelegram: number; usernameTelegram: string | null; creatoIl: Date }[]) => {
    if (users.length === 0) return "❌ Nessun utente registrato.";
    const items = users.map(
      (u, i) =>
        `${i + 1}. <code>${u.idTelegram}</code> (${u.usernameTelegram ? "@" + escHtml(u.usernameTelegram) : "—"}) — ${u.creatoIl instanceof Date ? u.creatoIl.toLocaleDateString("it-IT") : String(u.creatoIl)}`,
    );
    return `👥 <b>Utenti registrati (${users.length})</b>\n\n${items.join("\n")}`;
  },

  infoUtente: (u: User) =>
    "👤 <b>Utente</b>\n" +
    `🆔 <code>${u.idTelegram}</code>\n` +
    `👤 Username: ${u.usernameTelegram ? "@" + escHtml(u.usernameTelegram) : "—"}\n` +
    `📛 Nome: ${escHtml(u.nomeTelegram)}\n` +
    `📅 Registrato: ${u.creatoIl instanceof Date ? u.creatoIl.toLocaleDateString("it-IT") : String(u.creatoIl)}\n\n` +
    `<b>📍 Comuni (${u.comuni.length})</b>\n` +
    u.comuni
      .map((c) => `• ${escHtml(c.nome)}  🔔 ${c.notificheMeteo ? "✅" : "❌"}`)
      .join("\n"),

  utenteNonTrovato: "❌ Utente non trovato.",

  broadcastRiepilogo: (inviato: number, totale: number, falliti: number) =>
    falliti === 0
      ? `✅ Messaggio inviato a ${inviato}/${totale} utenti.`
      : `⚠️ Messaggio inviato a ${inviato}/${totale} utenti (${falliti} falliti).`,

  broadcastVuoto: "❌ Inserisci un messaggio da inviare: /admin_broadcast &lt;testo&gt;",
};
