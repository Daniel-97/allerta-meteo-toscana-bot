DROP INDEX "comuni_nome_idx";--> statement-breakpoint
DROP INDEX "comuni_url_unique";--> statement-breakpoint
DROP INDEX "utenti_comuni_id_telegram_comune_url_unique";--> statement-breakpoint
ALTER TABLE `comuni` ALTER COLUMN "provincia" TO "provincia" text;--> statement-breakpoint
CREATE INDEX `comuni_nome_idx` ON `comuni` (`nome`);--> statement-breakpoint
CREATE UNIQUE INDEX `comuni_url_unique` ON `comuni` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `utenti_comuni_id_telegram_comune_url_unique` ON `utenti_comuni` (`id_telegram`,`comune_url`);--> statement-breakpoint
ALTER TABLE `comuni` ALTER COLUMN "zona" TO "zona" text;