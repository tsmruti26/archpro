# AI Project Log — backend

Spring Boot 3 / Java 17 REST API backing the AI Project Log Chrome extension. Same
data model as the extension's `chrome.storage.local` version (projects → checkpoints,
each checkpoint with its own chat link), now in a real database so it's not tied to
one browser profile.

## Run it

Requires Java 17+ and Maven.

```bash
cd ai-project-log-backend
mvn spring-boot:run
```

Starts on `http://localhost:8080`, backed by a local H2 file database at `./data/` —
zero setup needed. Check it's up:

```bash
curl http://localhost:8080/api/health
```

### Switch to Postgres

Set these env vars before starting (or put them in `application.properties`):

```bash
export DB_URL=jdbc:postgresql://localhost:5432/ai_project_log
export DB_USER=postgres
export DB_PASSWORD=secret
export DB_DRIVER=org.postgresql.Driver
```

### Summary generation

Set your Anthropic key as an env var — the key stays server-side now instead of
living in the browser:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### CORS

By default all origins are allowed (`app.cors.allowed-origins=*`) for easy local
dev. Once your extension is loaded, restrict it to just that origin:

```bash
export CORS_ORIGINS=chrome-extension://<your-extension-id>
```

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/projects` | — | Query params: `status` (`ACTIVE`/`ARCHIVED`), `q` (name search) |
| GET | `/api/projects/{id}` | — | Full project with checkpoints |
| POST | `/api/projects` | `{ name, source }` | Reuses an existing project if the name matches (case-insensitive) |
| PATCH | `/api/projects/{id}` | `{ name?, status? }` | Rename / archive / unarchive |
| DELETE | `/api/projects/{id}` | — | Deletes project + all checkpoints |
| POST | `/api/projects/{id}/checkpoints` | `{ note, link? }` | Adds a checkpoint; marks cached summary stale |
| PATCH | `/api/projects/{id}/checkpoints/{checkpointId}/link` | `{ link }` | Set/edit that checkpoint's chat URL |
| DELETE | `/api/projects/{id}/checkpoints/{checkpointId}` | — | Removes one checkpoint |
| POST | `/api/projects/{id}/summary` | — | Calls Anthropic, caches the result on the project |

`source` is one of `CLAUDE`, `GPT`, `GEMINI`, `OTHER`. `status` is `ACTIVE` or `ARCHIVED`.

## Wiring up the extension

The extension currently talks to `chrome.storage.local` directly in `storage.js`.
To point it at this backend instead, that file's functions (`getProjects`,
`addProject`, `addCheckpoint`, etc.) need to become `fetch()` calls to
`http://localhost:8080/api/...` — same function signatures, so nothing else in
`popup.js` / `dashboard.js` / `project.js` has to change. Say the word and I'll
wire that up next.
