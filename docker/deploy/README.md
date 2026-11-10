# Automatic VPS deployments

This setup targets one x86-64 Linux VPS with Docker Engine and the Compose v2
plugin. It is separate from the local Docker Desktop preview. Use
`compose.yaml` with `compose.vps.yaml`; do not combine it with the development
or single-app production override. No VPS has been configured by adding these files.

## Release behavior

Every push to `main` builds the committed source, runs ESLint, TypeScript and
Vitest, and publishes runtime and migration images to GitHub Container Registry.
Only a successful build reaches the `production` GitHub environment. The workflow
serializes releases and never cancels a running deployment.

The VPS deploys image digests rather than mutable tags. It locks deployments,
waits for PostgreSQL, runs Drizzle migrations once, starts the inactive blue or
green slot, waits for its database-aware `/api/health` probe, and copies its
hashed browser assets to shared storage. Caddy validates and reloads the new
route without restarting. An HTTPS readiness check must succeed before the
configuration is committed. A failed switch attempts to restore the previous
route and fails the workflow. Both containers are retained for inspection.

The previous slot keeps running until the next release. Reusing it waits until
at least five minutes have passed since the last successful switch. Caddy allows
five minutes for streaming connections before closing them; clients must
reconnect. Ordinary requests also need to finish within this drain window.
The first deployment has no existing release to keep available.

This avoids stopping the app for ordinary releases. It does not provide high
availability for a VPS, Docker daemon, database or proxy failure. Infrastructure
upgrades need separate maintenance. Size RAM and disk for both app containers,
the database, retained assets and backups.
Releases do not recreate existing database or backup containers. The initial
backup helper is saved at `/opt/teamwork/.deploy/backup.sh`; update that helper
and restart its container explicitly during infrastructure maintenance.

## One-time VPS setup

1. Install Docker Engine, Compose v2, Bash, `flock` (util-linux), `tar` and standard
   GNU coreutils on the VPS. Use the provider's supported installation procedure.
2. Create a dedicated SSH deployment user. Give it Docker access and ownership of
   `/opt/teamwork`, including its `releases` subdirectory. Docker access grants
   effective root privileges; use a dedicated key and restrict server access.
3. Create `/opt/teamwork/.env.docker` from the repository's `.env.docker.example`.
   Generate independent production secrets. Set `APP_DOMAIN` to the real domain,
   `APP_URL` to its exact HTTPS origin, database credentials and real SMTP settings.
   Set file permissions to `600`. Never upload local secrets or databases.
4. Point the domain's DNS to the VPS and allow TCP 80/443, UDP 443, and your SSH
   port. Database and app slots are only reachable on the private Docker network.
5. As the deployment user, authenticate Docker to `ghcr.io` using a credential
   with `read:packages` and access to this repository's private package. Use
   `docker login ghcr.io --username YOUR_GITHUB_USER --password-stdin` and feed
   the token securely. The workflow's temporary `GITHUB_TOKEN` publishes images;
   the VPS uses its own read-only credential to pull them. Ensure a private
   repository's published packages remain private.
6. Configure encrypted off-server database backups and monitor failures. The
   included backup container keeps only local dumps. Test a restore before use.

The workflow uses the fixed Compose project name `teamwork`. Its database volume
is `teamwork_postgres_data`. This is a new database, independent of local Docker
Desktop volumes. Do not change the project name after installation.

## GitHub configuration

Create a `production` environment under repository Settings, Environments. Limit
deployment branches to `main`. For automatic deployment, do not enable required
reviewers. Also protect `main` and review changes to workflows and migrations.

Add these environment secrets:

| Secret            | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| `VPS_HOST`        | VPS IPv4 address or DNS hostname                            |
| `VPS_USER`        | Dedicated deployment user's Unix username                   |
| `VPS_PORT`        | SSH port, or omit to use 22                                 |
| `VPS_SSH_KEY`     | Private SSH deployment key, including its header and footer |
| `VPS_KNOWN_HOSTS` | Verified OpenSSH known_hosts entry for the VPS              |

Install the corresponding public key in that user's `authorized_keys`. Verify
the host key fingerprint through the provider console before adding the
known_hosts entry. A nonstandard port requires `[hostname]:port` format. The
workflow enforces host verification and does not trust a fresh network key scan.

Allow GitHub Actions to publish packages. The workflow grants `packages: write`
only to the build job. No application secrets are needed in GitHub or during the
image build. The VPS injects private configuration at runtime.

After setup, push the workflow to `main` or run **Production deployment** manually
from Actions on `main`. Manual runs on other branches must be rejected by the
environment's branch rule. The first run initializes the database and provisions
the HTTPS certificate. Follow the existing owner bootstrap procedure separately;
deployment does not create employee accounts.

## Database compatibility and rollback

Automatic migrations are a release contract: every migration must work with the
currently running application and the replacement. Add nullable columns/tables
first, deploy compatible readers/writers, backfill, then remove old structures
only after the rollback window closes. Do not rename/drop columns or add required
columns without staging. Migration failure leaves the old app running, but
already committed migrations are not automatically reversed.

Record the runtime digest, migration digest and release bundle path from the
successful Actions run. To roll back application code, use an existing bundle
and a previous compatible runtime digest:

```sh
bash /opt/teamwork/releases/RELEASE/docker/deploy/release.sh \
  ghcr.io/OWNER/REPOSITORY@sha256:RUNTIME_DIGEST \
  ghcr.io/OWNER/REPOSITORY@sha256:MIGRATION_DIGEST rollback
```

Use lowercase image paths. Rollback mode skips migrations and never reverses
database changes. It still verifies the replacement and switches through Caddy.
Do not use an earlier application against an incompatible schema.

Retained hashed assets let open tabs fetch chunks from previous versions.
Changed TanStack server-function contracts can still require a page refresh;
keep those contracts compatible during a release. A health probe checks database
connectivity, not every employee workflow. Add release-specific smoke checks
when introducing critical workflows.

## Operations

```sh
docker ps --filter label=com.docker.compose.project=teamwork
docker logs --tail 100 teamwork-edge-1
docker logs --tail 100 teamwork-blue-1
docker logs --tail 100 teamwork-green-1
```

The committed routing configuration is `/opt/teamwork/.deploy/caddy/Caddyfile`.
Do not edit it during a deployment. Reboot recovery uses this same file and
Docker restart policies. Keep both containers and their images while rollback
is needed. Monitor available disk: release bundles, image layers and retained
browser assets are not automatically pruned. Only remove assets after the
supported open-tab and rollback retention period. Never run `down --volumes`
against production data.

References: [GitHub image publishing](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images),
[Caddy graceful reload](https://caddyserver.com/docs/command-line#caddy-reload),
[Caddy streaming connection drain](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#stream_close_delay).
