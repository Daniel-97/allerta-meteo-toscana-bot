import { config } from "./config.js";
import { db } from "./db/index.js";
import { createArchivioComuni } from "./services/comuni.js";
import { createUsersRepository } from "./services/users.js";
import { createMeteoService } from "./services/meteo.js";
import { createHeatWaveService } from "./services/heatwave.js";
import { createBot } from "./bot/bot.js";

// config and db are eager singletons (fail fast on missing env vars)
const _db = db as any;
const services = {
  comuni: createArchivioComuni(_db),
  users: createUsersRepository(_db),
  meteo: createMeteoService(),
  heatwave: createHeatWaveService(),
};
const bot = createBot(config, services);

console.log("Bot avviato in polling...");
bot.start();
