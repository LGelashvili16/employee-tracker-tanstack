# Team Adwings VPS layout and GPS releases

The deployment account is `team-adwings-deploy`. The deployment root observed on
this VPS is `/var/www/team-adwings`. Switch accounts with
`sudo -iu team-adwings-deploy` if logged in as an administrator.

The deployed app URL is `https://team.adwings.ge`. Check its health with
`curl -fsS https://team.adwings.ge/api/health`. The host Nginx setup guide uses
the beta hostname in its examples.

| Path under the deployment root | Purpose                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `current`                      | Symlink to the active web release bundle.                                                 |
| `releases/`                    | Web release bundles created by GitHub Actions.                                            |
| `.deploy/`                     | Web release state and generated proxy configuration.                                      |
| `backups/`                     | Application database backups.                                                             |
| `.env.docker`                  | Private web and PostgreSQL configuration.                                                 |
| `.env.gps`                     | Private, persistent GPS receiver configuration.                                           |
| `compose.gps.yaml`             | Standalone receiver deployment file.                                                      |
| `compose.gps.database.yaml`    | Override that joins the GPS service to the application database's private Docker network. |

The deployment root contains release files and persistent configuration. The
web release bundles contain selected deployment files. Build the GPS image
from a full checkout on your build machine. Keep both environment files on the
VPS and leave the GPS authentication secret stable across releases.

## Read-only inventory

Run these as the deployment account. The output identifies the release target,
VPS platform, container images, networks, published ports, and the active
receiver mode. These commands do not print environment values or packet data.

```bash
cd /var/www/team-adwings
readlink -f current
docker version --format '{{.Server.Os}}/{{.Server.Arch}}'
docker ps --filter label=com.docker.compose.project=team-adwings-gps \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Networks}}'
docker ps --filter label=com.docker.compose.service=db \
  --format 'table {{.Names}}\t{{.Networks}}'
gps_id=$(docker ps -q \
  --filter label=com.docker.compose.project=team-adwings-gps \
  --filter label=com.docker.compose.service=gps)
if [ -n "$gps_id" ]; then
  docker exec "$gps_id" node -e 'console.log(process.env.GPS_DATABASE_URL ? "PostgreSQL mode" : "Journal-only mode")'
fi
```

The observed VPS platform is `linux/amd64` and the tracker uses VPS TCP
`15505`, published to container TCP `5505`. The receiver now stores reports in
the `team_adwings` database at `db:5433` via the `team-adwings_backend` Docker
network. Verify these settings with the live inventory when troubleshooting.
See the [GPS PostgreSQL setup](gps-receiver.md#postgresql-and-the-website-registry)
for first-time provisioning.

## When to rebuild the GPS image

| Change                                                                           | Deployment action                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Receiver, protocol decoder, GPS ingest, or scripts included in the GPS image     | Build, upload, and recreate the GPS service.                                                                                                                             |
| GPS Dockerfile, base image, build settings, or dependencies used by the receiver | Build, upload, and recreate the GPS service. Use `docker build --pull` when pulling a refreshed base image is part of the update.                                        |
| Website pages, map, or UI only                                                   | Run the normal web deployment.                                                                                                                                           |
| Database migration only                                                          | Deploy through the normal migration process. If the same release also changes receiver code, apply the migration and any new receiver grants before starting that image. |
| `.env.gps` values or GPS Compose settings only                                   | Edit the private environment on the VPS or upload the updated Compose files, then recreate GPS with the image already loaded on the VPS.                                 |

GitHub Actions updates the website and runs migrations from `main`. Upload the
GPS image separately when the receiver image changes. The GPS receiver role,
authentication secret, journal volume, and published port carry over to
routine image updates.

## Release the web app and GPS receiver

### 1. Identify the deployed commit

Wait for **Team Adwings production deployment** on `main` to succeed in GitHub
Actions. When a receiver update needs a migration, the web deployment applies
it first. Apply any new grants required by that migration to the existing GPS
database login before starting the receiver image. The current VPS already
has the diagnostics table and the `gps_receiver` grants.

For migration `0045_gps_telemetry_diagnostics.sql`, run this as the database
owner after migration and before recreating GPS with the new image:

```sql
GRANT UPDATE (error_code) ON TABLE public.gps_device_diagnostic TO gps_receiver;
```

On the VPS as `team-adwings-deploy`, confirm website health and copy the commit
SHA printed by the last command. Use that SHA for the image build.

```bash
cd /var/www/team-adwings
curl -fsS https://team.adwings.ge/api/health
basename "$(readlink -f current)" | cut -d- -f1
```

### 2. Build and export the image on Windows

Start Docker Desktop with its Linux engine. Run these commands in PowerShell
from the regular Team Adwings checkout. The temporary detached worktree gives
Docker a clean copy of the deployed commit while you continue development in
your regular checkout. If you already have a clean worktree for that commit,
set `$gpsBuildDir` to its path, switch into it, and start at the build block.
Keep `$gpsRepo` set to the regular checkout so you can return there afterward.

```powershell
Set-Location "$env:USERPROFILE\Desktop\team-adwings"
$gpsRepo = (Get-Location).Path
docker version --format '{{.Server.Os}}/{{.Server.Arch}}'
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'Could not fetch main' }

$gpsRelease = (Read-Host 'Deployed commit SHA from the VPS').Trim()
if ($gpsRelease -notmatch '^[a-f0-9]{40}$') { throw 'Enter the full deployed commit SHA' }
$gpsBuildDir = Join-Path (Split-Path $gpsRepo -Parent) "team-adwings-gps-release-$($gpsRelease.Substring(0, 12))"

git worktree add --detach "$gpsBuildDir" "$gpsRelease"
if ($LASTEXITCODE -ne 0) { throw 'Could not create the GPS release worktree' }
Set-Location "$gpsBuildDir"
git log -1 --oneline
```

Build for the VPS platform `linux/amd64`. The image tag below matches the
default name generated by the `team-adwings-gps` Compose project.

```powershell
$gpsImage = 'team-adwings-gps-gps:latest'
$gpsArchive = Join-Path $env:TEMP 'team-adwings-gps.tar'

docker build --platform linux/amd64 -f docker/gps/Dockerfile -t $gpsImage .
if ($LASTEXITCODE -ne 0) { throw 'GPS image build failed' }
docker image inspect $gpsImage --format '{{.Os}}/{{.Architecture}}'

docker image save --output "$gpsArchive" $gpsImage
if ($LASTEXITCODE -ne 0) { throw 'GPS image export failed' }
Get-Item "$gpsArchive" | Select-Object FullName, Length
```

### 3. Upload the archive and both Compose files

Run this in the same PowerShell window. The upload uses `lado`, the VPS login
used for the last transfer. Keep `.env.gps` and `.env.docker` private on the VPS.

```powershell
$gpsVps = Read-Host 'VPS hostname or IP'
scp compose.gps.yaml compose.gps.database.yaml "$gpsArchive" "lado@${gpsVps}:/home/lado/"
if ($LASTEXITCODE -ne 0) { throw 'GPS upload failed' }
ssh "lado@$gpsVps"
```

In the VPS shell as `lado`, copy the files into the deployment directory with
the correct owner, then switch to `team-adwings-deploy`.

```bash
sudo install -o team-adwings-deploy -g "$(id -gn team-adwings-deploy)" -m 0640 \
  /home/lado/compose.gps.yaml \
  /home/lado/compose.gps.database.yaml \
  /home/lado/team-adwings-gps.tar \
  /var/www/team-adwings/ &&
  sudo -iu team-adwings-deploy
```

### 4. Load the image and check PostgreSQL

Run this on the VPS as `team-adwings-deploy`. The second Compose file connects
the receiver to the application database network. The quiet config check
validates Compose settings without printing environment values.

```bash
cd /var/www/team-adwings
ls -lh compose.gps.yaml compose.gps.database.yaml team-adwings-gps.tar

gps=(docker compose -p team-adwings-gps --env-file .env.gps
  -f compose.gps.yaml -f compose.gps.database.yaml)

"${gps[@]}" config --quiet &&
  docker load -i team-adwings-gps.tar &&
  docker image inspect team-adwings-gps-gps:latest --format '{{.Os}}/{{.Architecture}}'
```

After the architecture check prints `linux/amd64`, run a read-only query from
a temporary container. This checks the uploaded image, network, and database
login while the current GPS service keeps running.

```bash
"${gps[@]}" run --rm --no-deps -T gps node --input-type=module - <<'JS'
import pg from 'pg'

const connectionString = process.env.GPS_DATABASE_URL
if (!connectionString) {
  console.error('GPS_DATABASE_URL is missing')
  process.exit(1)
}

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
  const { rows } = await client.query(
    'SELECT current_user AS role, current_database() AS database'
  )
  console.log(rows[0])
} catch (error) {
  console.error('GPS database connection failed', error.code ?? 'unknown')
  process.exitCode = 1
} finally {
  await client.end()
}
JS
```

Expected output is `{ role: 'gps_receiver', database: 'team_adwings' }`.
On `28P01`, check the password privately. On `ENOTFOUND`, check the hostname,
network name, and Compose override.

### 5. Recreate GPS and verify the tracker

After the query succeeds, run in the same VPS shell. For an environment-only
or Compose-only change, define the same `gps` array and run this block with
the image already loaded.

```bash
"${gps[@]}" config --quiet &&
  "${gps[@]}" up -d --no-build --force-recreate --no-deps gps &&
  "${gps[@]}" ps gps &&
  "${gps[@]}" port gps 5505 &&
  "${gps[@]}" logs --since 5m -f gps
```

Check that the service is running and the published port is `15505`. The
existing journal volume stays attached. In the logs look for an authenticated
JT808 `0102`, then a valid `0200` location. Open the device under
`https://team.adwings.ge/manage/gps` and confirm the new report appears in its
location history. When the tracker sends `0002`, confirm the heartbeat
timestamp updates in Connection Diagnostics. Press Ctrl+C to stop following
the logs.

### 6. Clean up the local worktree

Back in PowerShell, return to your regular checkout and check the release
worktree for changes.

```powershell
Set-Location "$gpsRepo"
git -C "$gpsBuildDir" status --short
```

If the status check succeeds and prints nothing, remove the release worktree.

```powershell
git worktree remove "$gpsBuildDir"
git worktree list
```
