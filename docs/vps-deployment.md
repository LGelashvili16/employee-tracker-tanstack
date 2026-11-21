# Team Adwings VPS layout and GPS releases

The deployment account is `team-adwings-deploy`. The deployment root observed on
this VPS is `/var/www/team-adwings`. Switch accounts with
`sudo -iu team-adwings-deploy` if logged in as an administrator.

| Path under the deployment root | Purpose                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `current`                      | Symlink to the active web release bundle.                                                                                                                     |
| `releases/`                    | Web release bundles created by GitHub Actions.                                                                                                                |
| `.deploy/`                     | Web release state and generated proxy configuration.                                                                                                          |
| `backups/`                     | Application database backups.                                                                                                                                 |
| `.env.docker`                  | Private web and PostgreSQL configuration.                                                                                                                     |
| `.env.gps`                     | Private, persistent GPS receiver configuration.                                                                                                               |
| `compose.gps.yaml`             | Standalone receiver deployment file.                                                                                                                          |
| `compose.gps.database.yaml`    | Optional override deployed alongside the GPS Compose file when the receiver needs the app's Docker backend network. It was absent from the directory listing. |

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
gps_id=$(docker compose -p team-adwings-gps --env-file .env.gps -f compose.gps.yaml ps -q gps)
if [ -n "$gps_id" ]; then
  docker exec "$gps_id" node -e 'console.log(process.env.GPS_DATABASE_URL ? "PostgreSQL mode" : "Journal-only mode")'
fi
```

The last observed receiver publication was VPS TCP `15505` to container TCP
`5505`. Use the live inventory to confirm the public port before changing the
tracker. If PostgreSQL mode uses the web stack's private Docker network, use
the actual network name from the database container in `GPS_DATABASE_NETWORK`
and include the override in the receiver's Compose commands. The database
port is the service's internal port, which is configurable. See the
[GPS PostgreSQL setup](gps-receiver.md#postgresql-and-the-website-registry).

## Release the web app and GPS receiver

1. Deploy the code through the usual web release. A successful GitHub Actions
   deployment from `main` applies migrations before switching the web app.
   This release includes `0043_gps_device_diagnostics.sql`. No manual restart
   of the web containers is needed. See the [web deployment guide](../docker/deploy/host-nginx.md).
   To confirm the table exists, substitute the app database container name
   from the inventory if it differs from `team-adwings-db-1`.

   ```bash
   docker exec team-adwings-db-1 sh -c \
     'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.gps_device_diagnostic"'
   ```

2. If the receiver connects using a dedicated PostgreSQL login, grant it access
   to the new diagnostics table after the migration and before updating the
   receiver. Run the following as the database owner in the application DB.
   Replace `gps_receiver` with the actual receiver database role.

   ```sql
   GRANT SELECT, INSERT, UPDATE (received_at)
     ON TABLE public.gps_device_diagnostic TO gps_receiver;
   ```

3. From the updated full repository checkout on your build machine, build and
   save the independent receiver image. These commands are for PowerShell.
   Set `$gpsPlatform` to the platform reported by the VPS inventory. Transfer
   the files using your working SSH account or existing upload method.

   ```powershell
   $gpsPlatform = 'linux/amd64'
   $gpsArchive = Join-Path $env:TEMP 'team-adwings-gps.tar'
   docker build --platform $gpsPlatform -f docker/gps/Dockerfile -t team-adwings-gps-gps:latest .
   if ($LASTEXITCODE -ne 0) { throw 'GPS image build failed' }
   docker image save --output "$gpsArchive" team-adwings-gps-gps:latest
   if ($LASTEXITCODE -ne 0) { throw 'GPS image export failed' }
   scp compose.gps.yaml "$gpsArchive" 'team-adwings-deploy@YOUR_VPS_HOST:/var/www/team-adwings/'
   ```

   Transfer `compose.gps.database.yaml` as well if using the app's backend
   network. Keep the existing `.env.gps` and published port.

4. On the VPS as `team-adwings-deploy`, load the image and recreate only
   the GPS service. Run this in Bash. The example uses the base Compose file.
   If the receiver uses the web stack's Docker backend network, add
   `-f compose.gps.database.yaml` to the array after `-f compose.gps.yaml`.

   ```bash
   cd /var/www/team-adwings
   gps=(docker compose -p team-adwings-gps --env-file .env.gps -f compose.gps.yaml)
   docker load -i team-adwings-gps.tar &&
     "${gps[@]}" up -d --no-build --force-recreate gps &&
     "${gps[@]}" ps gps &&
     "${gps[@]}" logs --tail=100 -f gps
   ```

   The existing journal volume stays attached. In PostgreSQL mode, verify a
   new heartbeat and a valid position report, then check the device's
   diagnostics and location history in the website. Stop following logs with
   Ctrl+C.
