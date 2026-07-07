CREATE TABLE `comuni` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`url` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comuni_nome_idx` ON `comuni` (`nome`);--> statement-breakpoint
CREATE UNIQUE INDEX `comuni_url_unique` ON `comuni` (`url`);--> statement-breakpoint
CREATE TABLE `sessioni` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stato_allerte` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chiave` text NOT NULL,
	`fingerprint` text NOT NULL,
	`aggiornato_il` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stato_allerte_chiave_unique` ON `stato_allerte` (`chiave`);--> statement-breakpoint
CREATE TABLE `utenti` (
	`id_telegram` integer PRIMARY KEY NOT NULL,
	`username_telegram` text,
	`nome_telegram` text NOT NULL,
	`creato_il` integer
);
--> statement-breakpoint
CREATE TABLE `utenti_comuni` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_telegram` integer NOT NULL,
	`comune_nome` text NOT NULL,
	`comune_url` text NOT NULL,
	`notifiche_meteo` integer DEFAULT false NOT NULL,
	`aggiunto_il` integer,
	FOREIGN KEY (`id_telegram`) REFERENCES `utenti`(`id_telegram`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `utenti_comuni_id_telegram_comune_url_unique` ON `utenti_comuni` (`id_telegram`,`comune_url`);