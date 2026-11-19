I renamed the app to **Team Adwings**, with `team-adwings` for the repo, Docker project, and deployment names. I also replaced the single-container release with a **blue/green deployment** for `beta.adwings.ge`. The revised [GitHub workflow](C:/Users/user/Desktop/tanstack-employee-tracking/.github/workflows/deploy.yml) checks pull requests. A merge or direct push to `main` builds and deploys automatically. A PR closed without merging doesn’t deploy.

Host Nginx still owns HTTPS. It forwards beta traffic to a private Caddy switcher on `127.0.0.1:3006`, which routes to the active app container. **A failed build, migration command, or candidate health check leaves the active container serving.** The release switches traffic only after the new container is healthy, and restores the previous route if the proxy check fails. Keep migrations compatible with both versions and avoid long blocking schema changes. Two app containers on one VPS don’t protect against a VPS or database outage.

Follow these steps in order. **Leave the current beta Nginx config in service until the new release answers on port `3006`.**

## 1. Windows · Generate the renamed SSH key

Open **PowerShell on Windows**. This creates a dedicated key that GitHub Actions can use without an interactive passphrase.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null

$KeyPath = "$env:USERPROFILE\.ssh\team-adwings-actions"
ssh-keygen -t ed25519 -f $KeyPath -C "team-adwings-github-actions"

Get-Content -LiteralPath "$KeyPath.pub"
```

Press **Enter twice** when asked for a passphrase. If the key already exists, keep it and skip generation. Copy the one public line beginning with `ssh-ed25519`. The `.pub` file goes on the VPS. The file without `.pub` goes into a GitHub secret. Keep the old key available until the new deployment succeeds.

## 2. VPS · Prepare the existing user and check for an old database

SSH into the VPS as `lado` and run:

```bash
id team-adwings-deploy
sudo docker compose version
uname -m
sudo ss -ltnp 'sport = :3006'

sudo docker volume ls --format '{{.Name}}' |
  grep -E '^(teamwork|team-adwings)_postgres_data$' || true
```

You already created `team-adwings-deploy`, so there’s no `adduser` step. The VPS should be `x86_64`, and port `3006` should be free for the first install.

**Check the volume output before creating credentials.**

- **No matching volume:** This is a fresh install. Use the new `team-adwings` Compose project.
- **`teamwork_postgres_data` contains existing app data:** Back it up, preserve the current `.env.docker` database credentials, and set `TEAM_ADWINGS_COMPOSE_PROJECT=teamwork` in GitHub in step 4. The new app can reuse that database while any old single-container app on port `3005` keeps serving through the cutover. Renaming that Docker project and its persistent volume needs a separate database migration.
- **Both volumes exist and you’re unsure which holds production data:** Identify the live database before proceeding. A name change should never silently send production to a fresh database.

Create the directories and allow the deploy user to operate Docker:

```bash
sudo usermod -aG docker team-adwings-deploy
deploy_group=$(id -gn team-adwings-deploy)

sudo install -d -m 0750 -o team-adwings-deploy -g "$deploy_group" \
  /var/www/team-adwings

sudo install -d -m 0700 -o team-adwings-deploy -g "$deploy_group" \
  /var/www/team-adwings/releases \
  /home/team-adwings-deploy/.ssh

sudo -H -u team-adwings-deploy docker compose version
```

Docker access is effectively root access, so keep this deployment key dedicated to GitHub Actions.

### Create the production `.env.docker`

**For a fresh install**, run:

```bash
sudo -H -u team-adwings-deploy bash <<'ENV_SETUP'
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

This generates two independent secrets. The file stays on the VPS. PostgreSQL port `5433` is internal to Docker and isn’t published, so the shop’s PostgreSQL on `5432` stays separate. Leave `REDIS_URL` empty for now.

**If `.env.docker` already exists**, edit it instead:

```bash
sudo -H -u team-adwings-deploy nano /var/www/team-adwings/.env.docker
```

Set `APP_URL=https://beta.adwings.ge` and `APP_DOMAIN=beta.adwings.ge`. Keep the existing database name, user, password, port, and `BETTER_AUTH_SECRET` if reusing the database. Add Team Adwings’ SMTP settings here if you need outgoing email.

## 3. VPS · Install the SSH public key and verify access

On the VPS, paste the **public** line from step 1:

```bash
read -r -p 'Paste the Team Adwings Actions public key: ' DEPLOY_PUBLIC_KEY

printf 'restrict %s\n' "$DEPLOY_PUBLIC_KEY" |
  sudo -u team-adwings-deploy tee -a \
    /home/team-adwings-deploy/.ssh/authorized_keys >/dev/null

sudo chmod 0600 /home/team-adwings-deploy/.ssh/authorized_keys
unset DEPLOY_PUBLIC_KEY
```

This appends the new key and keeps existing access available during the transition. `restrict` disables facilities such as SSH forwarding and interactive terminal allocation while permitting the workflow’s noninteractive commands.

From your trusted VPS session, get the server’s **host key**. The commands below use the VPS IP and SSH port from your earlier tests. Substitute them if either has changed.

```bash
VPS_IP=91.99.233.177
VPS_SSH_PORT=22

KNOWN_HOST=$VPS_IP
if [ "$VPS_SSH_PORT" != 22 ]; then
  KNOWN_HOST="[$VPS_IP]:$VPS_SSH_PORT"
fi

sudo awk -v host="$KNOWN_HOST" '{ print host, $1, $2 }' \
  /etc/ssh/ssh_host_ed25519_key.pub
```

Copy the entire line printed. Back on **Windows PowerShell**, test the new private key against that verified host key:

```powershell
$KeyPath = "$env:USERPROFILE\.ssh\team-adwings-actions"
$KnownHostsPath = "$env:USERPROFILE\.ssh\team-adwings-known_hosts"
$VpsIp = "91.99.233.177"
$VpsPort = 22

$KnownHostLine = Read-Host "Paste the verified VPS host key line"
Set-Content -LiteralPath $KnownHostsPath -Value $KnownHostLine -Encoding ascii

ssh -i $KeyPath -p $VpsPort `
  -o IdentitiesOnly=yes `
  -o StrictHostKeyChecking=yes `
  -o "UserKnownHostsFile=$KnownHostsPath" `
  "team-adwings-deploy@$VpsIp" `
  'id && docker compose version && test -w /var/www/team-adwings/releases'
```

This checks the new key, the server identity, Docker access, and permission to write release files. Resolve any errors here before setting up the GitHub workflow.

**If the GHCR package is private**, log in on the VPS as the deployment user. Use a GitHub classic token with `read:packages` from an account with access to the package:

```bash
read -r -p 'GitHub username: ' GHCR_USER
read -rs -p 'GHCR read token: ' GHCR_TOKEN
printf '\n'

printf '%s\n' "$GHCR_TOKEN" |
  sudo -H -u team-adwings-deploy docker login ghcr.io \
    --username "$GHCR_USER" --password-stdin

unset GHCR_USER GHCR_TOKEN
```

This gives the VPS permission to pull the production images. GitHub Actions uses its own `GITHUB_TOKEN` to publish them.

## 4. GitHub · Rename the repo and create the production environment

In the existing GitHub repository, open **Settings → General → Repository name** and rename it to **`team-adwings`**. This keeps the existing repo history and PRs. The workflow derives the GHCR image path from the repo name, so the new images will be published under `ghcr.io/lgelashvili16/team-adwings`. [GitHub repository rename documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)

In **Settings → Environments**, create **`team-adwings-production`**. Set **Deployment branches and tags → Selected branches and tags → Branch → `main`**. Leave required reviewers disabled if you want fully automatic redeploys. [GitHub environment setup](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

Add these **environment variables and secrets**:

| Type | Name | Value |
|---|---|---|
| Variable | `TEAM_ADWINGS_DEPLOY_TARGET` | `nginx` |
| Variable | `TEAM_ADWINGS_COMPOSE_PROJECT` | Leave unset for a fresh install. Use `teamwork` only to reuse the old production database and project. |
| Secret | `TEAM_ADWINGS_VPS_HOST` | `91.99.233.177`, if this is still your VPS IP |
| Secret | `TEAM_ADWINGS_VPS_PORT` | `22`, or the actual SSH port |
| Secret | `TEAM_ADWINGS_VPS_USER` | `team-adwings-deploy` |
| Secret | `TEAM_ADWINGS_VPS_SSH_KEY` | The full new **private** key |
| Secret | `TEAM_ADWINGS_VPS_KNOWN_HOSTS` | The full verified host key line from step 3 |

The workflow reads **`TEAM_ADWINGS_DEPLOY_TARGET`**. The old `TEAMWORK_DEPLOY_ACTION` variable won’t select this deployment.

To copy the private key without printing it in your terminal, run on Windows:

```powershell
Get-Content -Raw -LiteralPath "$env:USERPROFILE\.ssh\team-adwings-actions" |
  Set-Clipboard
```

Paste it into `TEAM_ADWINGS_VPS_SSH_KEY`, save, then clear the clipboard:

```powershell
Set-Clipboard -Value ""
```

The workflow already exists in the repo. There’s no separate action to create in GitHub. If `main` requires the old build status, select the new workflow’s **`checks`** job as the required PR check.

## 5. Windows · Push the change and trigger the first release

In PowerShell, from your local project directory:

```powershell
git remote set-url origin https://github.com/LGelashvili16/team-adwings.git
git remote -v
git status --short
git branch --show-current
git diff --stat
```

Review the changes before staging. If you’re on your feature branch and the working tree contains the changes you intend to ship:

```powershell
git add -A
git diff --cached --stat
git commit -m "Rename app to Team Adwings and deploy through blue-green releases"
git push -u origin HEAD
```

Open or update the PR into `main`, wait for **`checks`**, and merge it. The merge triggers **Team Adwings production deployment**. If the changes are already on `main`, use **Actions → Team Adwings production deployment → Run workflow → `main`**.

The first release stages the app on the private proxy port. It doesn’t edit host Nginx. After Actions succeeds, verify on the VPS:

```bash
curl -fsS -H 'X-Real-IP: 127.0.0.1' \
  http://127.0.0.1:3006/api/health
printf '\n'

sudo ls -ld /var/www/team-adwings/current

PROJECT=team-adwings
sudo docker ps --filter "label=com.docker.compose.project=$PROJECT" \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Use `PROJECT=teamwork` if you chose the legacy project. Expect `{"status":"ok"}` and an `edge` container published only at `127.0.0.1:3006`. **If this check fails, leave Nginx where it is** and inspect the Actions log.

## 6. VPS · Switch only `beta.adwings.ge` in Nginx

Check the beta certificate and active site before installing the replacement:

```bash
sudo nginx -T 2>&1 | grep -nE \
  '^# configuration file |server_name .*beta\.adwings\.ge'

sudo openssl x509 \
  -in /etc/letsencrypt/live/beta.adwings.ge/fullchain.pem \
  -noout -checkhost beta.adwings.ge

sudo openssl x509 \
  -in /etc/letsencrypt/live/beta.adwings.ge/fullchain.pem \
  -noout -checkend 86400
```

The certificate should match and still be valid. The same beta site can have one HTTP block and one HTTPS block. If a second site file also claims the domain, resolve that first.

You already backed up the previous beta config. Save a fresh copy of the file actually on the VPS immediately before replacing it:

```bash
sudo install -d -m 0700 /root/nginx-backups

BETA_BACKUP="/root/nginx-backups/beta.adwings.conf.$(date +%Y%m%d-%H%M%S)"
sudo cp -a /etc/nginx/sites-available/beta.adwings.conf "$BETA_BACKUP"
printf 'Saved beta config to %s\n' "$BETA_BACKUP"

sudo install -m 0644 \
  /var/www/team-adwings/current/docker/deploy/beta.adwings.conf \
  /etc/nginx/sites-available/beta.adwings.conf

if ! sudo find -L /etc/nginx/sites-enabled -maxdepth 1 \
    -samefile /etc/nginx/sites-available/beta.adwings.conf -print |
    grep -q .; then
  sudo ln -s /etc/nginx/sites-available/beta.adwings.conf \
    /etc/nginx/sites-enabled/beta.adwings.conf
fi

sudo nginx -t
```

Proceed only if the test passes without a conflicting server name warning. Then **reload** Nginx and verify the beta route:

```bash
sudo systemctl reload nginx

curl --noproxy '*' --resolve beta.adwings.ge:443:127.0.0.1 \
  -fsS https://beta.adwings.ge/api/health
printf '\n'

curl -fsS https://beta.adwings.ge/api/health
printf '\n'
```

Both checks should return `{"status":"ok"}`. Open `beta.adwings.ge` and the shop in your browser to confirm each serves the expected site. Future app releases switch traffic internally and don’t need a host Nginx reload. [Nginx graceful reload behavior](https://nginx.org/en/docs/control.html#reconfiguration)

If you need to undo this **first domain cutover**, restore the beta site file from the path printed above:

```bash
sudo cp -a "$BETA_BACKUP" /etc/nginx/sites-available/beta.adwings.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Create the first owner, verify backups, and retire the old key

If this is a **fresh database**, run once on the VPS:

```bash
sudo -H -u team-adwings-deploy bash <<'OWNER_SETUP'
set -euo pipefail
cd /var/www/team-adwings

docker compose -p team-adwings --profile release \
  --project-directory "$PWD" \
  --env-file .env.docker \
  --env-file current/images.env \
  -f current/compose.yaml \
  -f current/compose.vps.yaml \
  -f current/compose.nginx.yaml \
  run --rm --no-deps migrate \
  pnpm exec tsx scripts/bootstrap-owner.ts --code owner --name 'Lado'
OWNER_SETUP
```

Use the printed activation code at [beta.adwings.ge/auth/register](https://beta.adwings.ge/auth/register), then sign in as `owner`. Skip this command if your existing database already has an owner.

Check that backups are being written:

```bash
sudo docker logs --tail 30 team-adwings-backup-1
sudo ls -lh /var/www/team-adwings/backups
```

For the legacy project, the backup container is `teamwork-backup-1`. Keep an off-VPS copy and test a restore separately.

After a successful Actions deployment using the **new** key, remove only the old Actions public-key line from the deploy user’s `authorized_keys`:

```bash
sudoedit /home/team-adwings-deploy/.ssh/authorized_keys
```

You can then remove `TEAMWORK_DEPLOY_ACTION`, `TEAMWORK_DEPLOY_TARGET`, and any superseded deployment secrets from GitHub once no workflow uses them. A few internal identifiers still contain `teamwork` because the old and new app versions share attendance cookies, database events, and other persisted values during rollout. Keeping those identifiers stable protects existing sessions and data.

I verified the production build, TypeScript, lint, 646 automated tests, the Compose topology, the release failure scenarios, and a local Caddy health request. I haven’t changed the GitHub settings or deployed to your VPS. The commands above and the [deployment runbook](C:/Users/user/Desktop/tanstack-employee-tracking/docker/deploy/host-nginx.md) cover the live setup.
