# Docker setup

This configuration is for the **TanStack Start application** at this repository
root. The multi-stage Dockerfile installs the committed pnpm dependencies and
builds Vite with Nitro's `node-server` preset. It copies the self-contained
`.output` directory, including public assets, and runs
`node .output/server/index.mjs` as a non-root user on `0.0.0.0:3000`.
Secrets, backups, host dependencies, and local build output are excluded from the
Docker build context by `.dockerignore`.

PostgreSQL listens on `POSTGRES_PORT` (default `5433`) inside Docker and on the
same localhost port when `compose.dev.yaml` is included. Host tools use
`localhost:5433`; containers use `db:5433`.

## Configure secrets

Copy `.env.docker.example` to `.env.docker`. Set `POSTGRES_PASSWORD` and
`BETTER_AUTH_SECRET` to two independently generated values:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use a hex database password: the production Compose file embeds it in a URL.
Custom passwords containing reserved URL characters need URL encoding instead.
The populated `.env.docker` is excluded from Git.

## Local development

Start PostGIS and Mailpit, then run TanStack Start on your computer:

```sh
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml --profile dev up -d
pnpm dev
```

The development app is available at http://localhost:3005.

Configure the application in `.env.local` when implementing database, auth, and
email integrations:

```dotenv
DATABASE_URL=postgresql://employee_tracking:YOUR_HEX_PASSWORD@127.0.0.1:5433/employee_tracking
BETTER_AUTH_SECRET=YOUR_AUTH_SECRET
BETTER_AUTH_URL=http://localhost:3005
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=Employee Tracking <dev@example.test>
```

Mailpit's inbox is http://localhost:8026 and SMTP is localhost:1025. Database
and development service ports bind only to localhost. The app does not yet
implement these integrations: environment variables do not install Drizzle,
Better Auth, an SMTP client, or location tracking automatically.

Add `--profile cache` to enable Redis. Host applications use
`redis://127.0.0.1:6379`; containers use `redis://redis:6379`. Redis has persistent
storage and `noeviction` for future queue use. Select memory limits and cache
retention to suit your workload before using it heavily.

## Production on a VPS

Set `APP_DOMAIN` to your domain and `APP_URL` to its HTTPS URL in `.env.docker`.
Point DNS at the VPS, allow HTTP/HTTPS ports 80/443, and configure real
transactional SMTP settings. Start the app, database, proxy, and backups:

```sh
docker compose --env-file .env.docker -f compose.yaml -f compose.prod.yaml --profile production --profile proxy --profile backups up -d --build
```

Caddy handles HTTPS and routes traffic to `app:3000`; its config supports
streaming responses and WebSocket upgrades. Your application still needs to
implement SSE/WebSocket endpoints using an appropriate server integration.
Mailpit stays disabled in production. PostgreSQL and Redis have no published
production ports. Do not include `compose.dev.yaml` on the VPS.

To test the containerised app locally, omit `--profile proxy` and use
http://localhost:3005. Stop the host development server before starting the
container on the same port. To use Redis in production, add `--profile cache` and set
`REDIS_URL=redis://redis:6379` after implementing the application's Redis use.

If using Coolify or Dokploy, omit `--profile proxy` and attach `app` to the
deployment platform's proxy network. Route the platform proxy to the app's
container port 3000. A containerised proxy cannot reach the app using the host's
loopback mapping; it needs the correct shared Docker network.

The app's healthcheck tests HTTP responsiveness, not migration readiness.
Implement and run database migrations as a release step before exposing features
that need those tables. The runtime image does not include migration tools.
Build-time `VITE_*` values must be provided explicitly during the build if you
add them; runtime environment changes will not change values compiled into
browser JavaScript. These values are public, so never use them for secrets.

The PostGIS image is currently x86-64; check compatible images before choosing
an ARM VPS. PostgreSQL 18 stores data under `/var/lib/postgresql`. The initial
database includes PostGIS. For other databases, enable `CREATE EXTENSION IF NOT
EXISTS postgis;` before migrations requiring geographic types. Do not reuse an
older PostgreSQL data volume with a different major version without a planned
upgrade.

## Backups

The `backups` profile immediately creates a custom-format database dump, then
repeats every `BACKUP_INTERVAL_SECONDS` (default 86400). Completed archives are
checked using `pg_restore --list`, and local retention defaults to seven days.
The `./backups` directory is excluded from Git and Docker build context.

**These are local dumps on the VPS.** Configure encrypted offsite copies to your
chosen destination and monitor failures before relying on them for production.
Daily dumps can lose up to a day of changes; use WAL archiving/PITR if a smaller
recovery window is needed. Uploaded photos need their own durable storage and
backup strategy. Dumps omit roles and ownership; manage any custom roles/grants
separately.

Test restoration into a new database, replacing the filename and username:

```sh
docker compose --env-file .env.docker exec db createdb -U employee_tracking restore_check
docker compose --env-file .env.docker cp ./backups/database-TIMESTAMP.dump db:/tmp/restore.dump
docker compose --env-file .env.docker exec db pg_restore -U employee_tracking -d restore_check --no-owner --no-acl --exit-on-error /tmp/restore.dump
docker compose --env-file .env.docker exec db psql -U employee_tracking -d restore_check -c "SELECT PostGIS_Version();"
```

Verify restored application data as well; an archive listing is not a full
restore test. A worker container is intentionally deferred until there is an
implemented queue and worker entry point to run. A PostgreSQL-backed queue may
avoid a Redis dependency. Do not add an idle placeholder worker to production.

## Validate and stop

```sh
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml --profile dev --profile cache config --quiet
docker compose --env-file .env.docker -f compose.yaml -f compose.prod.yaml --profile production --profile proxy --profile backups config --quiet
```

Use the same file/profile arguments with `down` to stop services. Named database
volumes remain. `down --volumes` deletes those volumes, so do not use it on data
you need to keep. Compose file merge order is base first, environment second.
