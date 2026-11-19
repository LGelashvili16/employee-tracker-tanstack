# Deploy Team Adwings at beta.adwings.ge

Host Nginx keeps ports 80 and 443 and terminates HTTPS. It forwards only the
beta virtual host to a Caddy switcher at `127.0.0.1:3006`. Caddy listens on
loopback only and routes to the active blue or green container. A separate
Compose project named `team-adwings` owns the app, PostGIS, backups and network.
The shop keeps its existing Nginx site, PM2 process, host PostgreSQL and Redis.

GitHub Actions checks pull requests targeting `main`. Pushes to `main`, including
PR merges, publish two immutable images and deploy over SSH. The active slot
keeps serving during builds, migrations and candidate startup. Traffic switches
after the candidate is healthy. A failed proxy smoke check restores the previous
route. Keep migrations compatible with both versions. Database and VPS failures
are outside the protection provided by the two app slots.

## 1. Prepare the VPS

Run as `lado` on the VPS. Confirm the port check returns no listener and that
the beta certificate covers the domain and has time left. If the certificate
check fails, renew or issue it using the VPS's existing Certbot setup first.

```sh
sudo docker compose version
sudo ss -ltnp 'sport = :3006'
sudo docker volume ls --format '{{.Name}}' | grep -E '^(teamwork|team-adwings)_postgres_data$' || true
sudo nginx -T 2>&1 | grep -nE '^# configuration file |server_name .*beta\.adwings\.ge'
sudo openssl x509 -in /etc/letsencrypt/live/beta.adwings.ge/fullchain.pem \
  -noout -checkhost beta.adwings.ge
sudo openssl x509 -in /etc/letsencrypt/live/beta.adwings.ge/fullchain.pem \
  -noout -checkend 86400
```

If `teamwork_postgres_data` contains a prior production installation, back it
up and set the optional `TEAM_ADWINGS_COMPOSE_PROJECT=teamwork` GitHub variable
before first deploying. This reuses the current database service and leaves the
old single app on 3005 running while you stage the new proxy on 3006. Keep the
existing `.env.docker` credentials. A later move to the new volume name requires
a separate database migration. Fresh installs leave the variable unset.

Reuse the dedicated account. Membership in the `docker` group grants
root-equivalent privileges. Keep its key dedicated to this deployment.

```sh
id team-adwings-deploy
sudo usermod -aG docker team-adwings-deploy
deploy_group=$(id -gn team-adwings-deploy)
sudo install -d -m 0750 -o team-adwings-deploy -g "$deploy_group" /var/www/team-adwings
sudo install -d -m 0700 -o team-adwings-deploy -g "$deploy_group" \
  /var/www/team-adwings/releases /home/team-adwings-deploy/.ssh

sudo -u team-adwings-deploy bash <<'ENV_SETUP'
set -euo pipefail
umask 077
set -o noclobber
cat > /var/www/team-adwings/.env.docker <<EOF
APP_URL=https://beta.adwings.ge
APP_DOMAIN=beta.adwings.ge
POSTGRES_DB=team_adwings
POSTGRES_USER=team_adwings
POSTGRES_PORT=5433
POSTGRES_PASSWORD=$(openssl rand -hex 32)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
REDIS_URL=
EOF
ENV_SETUP
```

Run the environment creation block only for a fresh installation. If it already
exists, use `sudo -H -u team-adwings-deploy nano /var/www/team-adwings/.env.docker`
to set `APP_DOMAIN` and `APP_URL` while preserving existing credentials. If
Team Adwings needs email, set its `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` in this file before deployment.

## 2. Configure SSH and GitHub Actions

On Windows in PowerShell, generate a key for Actions and display the
public half. Keep the private half private.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null
$key = "$env:USERPROFILE\.ssh\team-adwings-actions"
ssh-keygen -t ed25519 -f $key -C team-adwings-github-actions
Get-Content "$key.pub"
```

Press Enter twice at the passphrase prompts for this unattended key.

On the VPS, paste only that public line in the following command. This appends
the key so existing access remains available during the transition. The `restrict`
option disables SSH forwarding and interactive PTY allocation for this key.

```sh
read -r -p 'Paste the Team Adwings Actions public key: ' TEAM_ADWINGS_PUBLIC_KEY
printf 'restrict %s\n' "$TEAM_ADWINGS_PUBLIC_KEY" | \
  sudo -u team-adwings-deploy tee -a /home/team-adwings-deploy/.ssh/authorized_keys >/dev/null
sudo chmod 0600 /home/team-adwings-deploy/.ssh/authorized_keys
unset TEAM_ADWINGS_PUBLIC_KEY
```

If the GHCR package is private, authenticate as the deploy user on the VPS
with a GitHub classic token that has `read:packages` and access to the package.

```sh
read -r -p 'GitHub username with access to the Team Adwings package: ' GHCR_USER
read -rs -p 'GHCR read token: ' GHCR_TOKEN; printf '\n'
printf '%s\n' "$GHCR_TOKEN" | sudo -H -u team-adwings-deploy \
  docker login ghcr.io --username "$GHCR_USER" --password-stdin
unset GHCR_TOKEN GHCR_USER
```

On the trusted VPS console, get the verified `known_hosts` line. Enter the
actual public VPS IP or SSH hostname you will use as `TEAM_ADWINGS_VPS_HOST`. Use the same
name in GitHub. For a custom SSH port, use `[host]:port` as the host field.

```sh
read -r -p 'TEAM_ADWINGS_VPS_HOST for GitHub (SSH port 22): ' TEAM_ADWINGS_SSH_HOST
sudo awk -v host="$TEAM_ADWINGS_SSH_HOST" '{print host, $1, $2}' \
  /etc/ssh/ssh_host_ed25519_key.pub
```

In GitHub, open **Settings > Environments > team-adwings-production**. Restrict deployments
to `main` and leave required reviewers disabled for unattended releases. Set:

| Kind     | Name                           | Value                                             |
| -------- | ------------------------------ | ------------------------------------------------- |
| Variable | `TEAM_ADWINGS_DEPLOY_TARGET`   | `nginx`                                           |
| Variable | `TEAM_ADWINGS_COMPOSE_PROJECT` | Leave unset for a fresh install                   |
| Secret   | `TEAM_ADWINGS_VPS_HOST`        | Same IP or SSH hostname used in `known_hosts`     |
| Secret   | `TEAM_ADWINGS_VPS_USER`        | `team-adwings-deploy`                             |
| Secret   | `TEAM_ADWINGS_VPS_PORT`        | `22`, or the actual SSH port                      |
| Secret   | `TEAM_ADWINGS_VPS_SSH_KEY`     | Entire private `~/.ssh/team-adwings-actions` file |
| Secret   | `TEAM_ADWINGS_VPS_KNOWN_HOSTS` | Entire verified line printed on the VPS           |

On a GitHub plan without private-repo environments, set the same values under
**Settings > Secrets and variables > Actions** as repository settings and
protect `main`. The deploy job has its own `main` guard. Ensure Actions can
publish to the Team Adwings GHCR package. Keep database and auth secrets on the VPS.
Rename the GitHub repository to `team-adwings` and update the local `origin`.
The workflow derives its GHCR image path from the GitHub repository name. Once
an Actions deployment succeeds using the new key, remove the superseded key from
`authorized_keys` and retire the old deployment settings in GitHub.

## 3. Deploy before switching the beta domain

Merge these deployment changes to `main`. The push triggers **Team Adwings
production deployment**. If setup finished after that push, use **Actions >
Team Adwings production deployment > Run workflow**, selecting `main`.

After Actions succeeds, verify the app locally on the VPS:

```sh
curl -fsS -H 'X-Real-IP: 127.0.0.1' http://127.0.0.1:3006/api/health
sudo docker ps --filter label=com.docker.compose.project=team-adwings \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expect `{"status":"ok"}` and the proxy bound to `127.0.0.1:3006`. The
database uses the `team-adwings_postgres_data` volume and has no published port.
Leave `127.0.0.1` off Team Adwings's attendance IP blocklist so the container's
readiness probe can reach the app.

## 4. Switch only beta.adwings.ge in Nginx

Confirm this domain's existing DNS records point to the VPS. Check the
`nginx -T` output from step 1 so the domain is configured in only one active
site file. Its two server blocks for HTTP and HTTPS are expected.

```sh
sudo install -d -m 0700 /root/nginx-backups
sudo cp -a /etc/nginx/sites-available/beta.adwings.conf \
  "/root/nginx-backups/beta.adwings.conf.$(date +%Y%m%d-%H%M%S)"
sudo install -m 0644 \
  /var/www/team-adwings/current/docker/deploy/beta.adwings.conf \
  /etc/nginx/sites-available/beta.adwings.conf

# Link the site only if no enabled filename already points to this file.
if ! sudo find -L /etc/nginx/sites-enabled -maxdepth 1 \
    -samefile /etc/nginx/sites-available/beta.adwings.conf -print | grep -q .; then
  sudo ln -s /etc/nginx/sites-available/beta.adwings.conf /etc/nginx/sites-enabled/beta.adwings.conf
fi
sudo nginx -t
```

Proceed only if the test passes without a conflicting server name warning. If
there is a warning, find the other beta site before reloading.

```sh
sudo systemctl reload nginx
curl --noproxy '*' --resolve beta.adwings.ge:443:127.0.0.1 \
  -fsS https://beta.adwings.ge/api/health
curl -fsS https://beta.adwings.ge/api/health
```

The new site reuses the TLS paths and HTTP/3 listeners from the old
configuration. It replaces the ecommerce-specific routing, overwrites
the client IP header and disables response buffering for live updates. Check
the shop separately in a browser after reload. Future Team Adwings releases use
the same app port and need no Nginx reload.

## 5. Create the first owner and check backups

On the VPS, run this once after the first successful deployment. The command
uses the migration image, which contains the owner provisioning script.

```sh
sudo -H -u team-adwings-deploy bash <<'OWNER_SETUP'
set -euo pipefail
cd /var/www/team-adwings
docker compose -p team-adwings --profile release \
  --project-directory "$PWD" \
  --env-file .env.docker --env-file current/images.env \
  -f current/compose.yaml -f current/compose.vps.yaml -f current/compose.nginx.yaml \
  run --rm --no-deps migrate pnpm exec tsx scripts/bootstrap-owner.ts \
  --code owner --name 'Lado'
OWNER_SETUP
```

Skip bootstrap if you already have an owner. If you reuse the legacy Compose
project, use `-p teamwork` and inspect the `teamwork-backup-1` container below.
Use the printed activation code at `https://beta.adwings.ge/auth/register`.
Treat the code as a credential. The database backup service writes to
`/var/www/team-adwings/backups`. Check its logs and test a restore into a
separate database before relying on the backups. Keep an off-server copy.

```sh
sudo docker logs --tail 30 team-adwings-backup-1
sudo ls -lh /var/www/team-adwings/backups
```
