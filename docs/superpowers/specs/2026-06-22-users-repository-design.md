# Design: Users Repository

**Data:** 2026-06-22 · **Branch:** `redesign-typescript` · **Sub-project:** 2 di 4

## Contesto e scopo

Il legacy `archivioUtenti.js` + `utente.js` gestiva utenti MySQL con schema 1 utente = 1 comune (callback-style). Il nuovo schema in `src/db/schema.ts` è già normalizzato con `utenti` (profilo) e `utentiComuni` (associazioni N:1), supportando N comuni per utente.

Si vuole creare un repository TypeScript async su Turso/Drizzle che espone API di dominio (findByTelegramId, subscribe, findAllWithComuni) nascondendo la split tra le due tabelle.

## File structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/services/users.ts` | Crea | Factory `createUsersRepository(db)` + tipi `User`, `UserComune`, `SubscribeInput` |
| `tests/services/users.test.ts` | Crea | Test con `createTestDb()` (riusato da sub-project 1) |
| `tests/helpers/test-db.ts` | Riusato | Nessuna modifica |
| `src/db/schema.ts` | Invariato | Tabelle `utenti`/`utentiComuni` già esistenti |
| `src/db/migrations/*` | Invariato | Nessuna nuova migrazione |

## Tipi

```ts
export interface UserComune {
  nome: string;          // utentiComuni.comuneNome
  url: string;           // utentiComuni.comuneUrl
  notificheMeteo: boolean;
}

export interface User {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comuni: UserComune[];
}

export interface SubscribeInput {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comune: { nome: string; url: string };
  notificheMeteo: boolean;
}
```

## API

```ts
export interface UsersRepository {
  findByTelegramId(id: number): Promise<User | undefined>;
  subscribe(input: SubscribeInput): Promise<void>;
  findAllWithComuni(): Promise<User[]>;
}
```

## Implementazione

**`subscribe` transazionale** — upsert `utenti` + upsert `utentiComuni` in `db.transaction()`, atomicamente:
- `onConflictDoUpdate` su `utenti.idTelegram` per aggiornare username/nome
- `onConflictDoUpdate` su `(idTelegram, comuneUrl)` per aggiornare notificheMeteo

**`findByTelegramId`** — query su `utenti` + query su `utentiComuni`, merge in JS.

**`findAllWithComuni`** — tutte le righe `utenti` + tutte le righe `utentiComuni`, merge via `Map<idTelegram, UserComune[]>`.

Niente JOIN con `comuni`: `UserComune` usa solo i campi di `utentiComuni` (nome, url, flag).

## Test

Riusa `createTestDb()` da sub-project 1. Fixture: 2 utenti con comuni vari.

Casi:
- `findByTelegramId` trovato → User + comuni popolati
- `findByTelegramId` non trovato → undefined
- `subscribe` utente nuovo → crea utente + associazione
- `subscribe` utente esistente + nuovo comune → aggiunge, preserva comuni precedenti
- `subscribe` re-iscrizione stesso comune → aggiorna flag, non duplica
- `findAllWithComuni` → merge corretto

## Fuori scope

- `unsubscribe`/`updateNotificationFlag` → YAGNI
- JOIN con `comuni` per provincia/zona → non serve
- Drizzle relational queries → 2 query + merge è sufficiente
- Rimozione legacy → sub-project 4
- Handler bot → sub-project 4
