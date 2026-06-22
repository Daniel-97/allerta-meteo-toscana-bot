CREATE TABLE `comuni` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`url` text NOT NULL,
	`provincia` text NOT NULL,
	`zona` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comuni_nome_idx` ON `comuni` (`nome`);--> statement-breakpoint
CREATE UNIQUE INDEX `comuni_url_unique` ON `comuni` (`url`);
