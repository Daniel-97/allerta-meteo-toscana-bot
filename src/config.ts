import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN è obbligatorio"),
  ADMIN_CHAT_ID: z.string().min(1, "ADMIN_CHAT_ID è obbligatorio"),
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL è obbligatorio"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN è obbligatorio"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variabili d'ambiente mancanti o non valide:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
