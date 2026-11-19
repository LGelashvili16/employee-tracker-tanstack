# VPS and Team Adwings commands

Run the Linux commands on the VPS as `lado`. Use PowerShell for the commands marked Windows.

## 1. General VPS commands

### Files, system resources, and ports

```bash
pwd                         # Show the current directory
ls -lah                     # List files, including hidden files, with readable sizes
uptime                      # Show uptime and load averages
free -h                     # Show RAM and swap usage
df -h                       # Show used and free space on mounted disks
du -sh /path/to/directory   # Show one directory's disk usage after substituting its path
top                         # Show live process and resource usage. Press q to leave.
sudo ss -lntup              # Show listening TCP and UDP sockets and their processes
```

### Services and logs

```bash
sudo systemctl status nginx docker --no-pager    # Check the host services
sudo journalctl -u nginx --since '1 hour ago' --no-pager
sudo journalctl -u docker --since '1 hour ago' --no-pager
```

### Docker commands for any project

```bash
sudo docker compose version   # Check the installed Compose version
sudo docker ps                # List running containers
sudo docker ps -a             # Include stopped containers
sudo docker stats --no-stream # Snapshot CPU, memory, network and disk I/O
sudo docker system df         # Show Docker disk usage across the VPS
```

Replace `CONTAINER` with a name from `docker ps -a`. Press `Ctrl+C` to leave the live log view.

```bash
sudo docker logs --tail 50 CONTAINER
sudo docker logs --follow --since 5m CONTAINER
sudo docker inspect --format 'state={{.State.Status}} restarts={{.RestartCount}}' CONTAINER
```

Run this from a Docker Compose project directory to show up to 100 recent log lines from each container in the project. Prefix the command with `sudo` on the VPS if your account needs it.

```bash
docker compose logs --tail 100
```

## 2. Team Adwings production on the VPS

Connect from **Windows PowerShell** using your personal SSH login.

```powershell
ssh lado@91.99.233.177
```

Traffic goes from host Nginx at `beta.adwings.ge` to the private Caddy proxy at `127.0.0.1:3006`, then to the active `blue` or `green` app container.

### List Team Adwings containers, including stopped ones

```bash
sudo docker ps -a --filter 'label=com.docker.compose.project=team-adwings' \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Show resources used by Team Adwings

```bash
sudo docker ps -q --filter 'label=com.docker.compose.project=team-adwings' |
  xargs -r sudo docker stats
```

Press `Ctrl+C` to leave. Add `--no-stream` after `docker stats` for one snapshot. `BLOCK I/O` is disk reads and writes. Use `du` for the size of saved backups.

### Check the active release and inspect its logs

```bash
sudo readlink -f /var/www/team-adwings/current
sudo grep '^# slot=' /var/www/team-adwings/.deploy/caddy/Caddyfile
```

If it prints `# slot=green`, use `team-adwings-green-1` in place of `team-adwings-blue-1` below.

```bash
sudo docker inspect --format 'image={{.Config.Image}} health={{.State.Health.Status}} restarts={{.RestartCount}}' \
  team-adwings-blue-1
sudo docker logs --tail 100 --timestamps team-adwings-blue-1
sudo docker logs --tail 50 --timestamps team-adwings-edge-1
sudo docker logs --tail 50 --timestamps team-adwings-db-1
```

For an HTTP 500 on a page, follow the active app logs with `sudo docker logs --follow --since 5m team-adwings-blue-1` and refresh the affected page once.

### Check the app and Nginx

Run these on the VPS. A healthy response from each check is `{"status":"ok"}`. If the private check succeeds and an HTTPS check fails, inspect the beta Nginx configuration and logs. If health succeeds but a page fails, inspect the app logs for that page's request.

```bash
# Private Caddy proxy and app
curl -fsS -H 'X-Real-IP: 127.0.0.1' http://127.0.0.1:3006/api/health

# Host Nginx and TLS, resolving the domain to this VPS locally
curl --noproxy '*' --resolve beta.adwings.ge:443:127.0.0.1 \
  -fsS https://beta.adwings.ge/api/health

# Public domain using normal DNS
curl -fsS https://beta.adwings.ge/api/health
```

```bash
sudo nginx -t
sudo nginx -T 2>&1 | grep -nE '^# configuration file |server_name .*beta\.adwings\.ge'
sudo tail -n 50 /var/log/nginx/error.log
```

After editing the host Nginx configuration, check that `sudo nginx -t` succeeds without conflicting server name warnings. Then run `sudo systemctl reload nginx`. Ordinary app releases switch traffic through Caddy.

### Inspect PostgreSQL and backups

Check the database name, connected role, and actual PostgreSQL port without printing credentials.

```bash
sudo docker exec team-adwings-db-1 sh -c \
  'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -p "$PGPORT" -v ON_ERROR_STOP=1 -c "SELECT current_database(), current_user;" -c "SHOW port;"'
```

To connect from pgAdmin, get the private container IP. In pgAdmin's **Connection** tab, use that IP, the database port above, `postgres` as the maintenance database, and `team_adwings` as the username. Use the VPS database password from `/var/www/team-adwings/.env.docker`. In the **SSH Tunnel** tab, enable the tunnel and use `lado` on `91.99.233.177:22` with your personal SSH credentials. Recheck the container IP after Docker recreates the database container.

```bash
sudo docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
  team-adwings-db-1
```

The worker saves `.dump` archives under `/var/www/team-adwings/backups/`. After deploying the fixed-time schedule, look for `Next database backup` at 05:00 Asia/Tbilisi and a `Created` line after each successful dump.

```bash
sudo ls -lht /var/www/team-adwings/backups
sudo du -sh /var/www/team-adwings/backups
sudo docker logs --tail 30 --timestamps team-adwings-backup-1
```

### Deploy or restart a service

A merge or push to `main` triggers **GitHub Actions → Team Adwings production deployment**. Check the `checks`, `publish`, and `deploy` jobs there. To run the current `main` commit again, use **Run workflow** and select `main`.

Use a container restart for recovery. Restarting the active app, Caddy proxy, or PostgreSQL can briefly interrupt traffic. Run only the command for the affected service and check health afterward.

```bash
sudo docker restart team-adwings-blue-1    # Use the active slot's name
sudo docker restart team-adwings-edge-1    # Private Caddy proxy
sudo docker restart team-adwings-db-1      # PostgreSQL
sudo docker restart team-adwings-backup-1  # Backup worker
```

## 3. Team Adwings local development on Windows

Run these in PowerShell from the repository root. Check the Docker context before running Docker commands to confirm it targets your local engine.

```powershell
docker context show
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml --profile dev up -d
docker compose --env-file .env.docker -f compose.yaml -f compose.dev.yaml --profile dev ps -a
```

```powershell
pnpm dev                        # Start the app at http://localhost:3005
pnpm test                       # Run the test suite
pnpm lint                       # Check lint rules
pnpm exec tsc --noEmit           # Check TypeScript types
```

See the [production setup guide](docker/deploy/production-setup-7-step-guide.md) for initial deployment and the [Docker guide](docker/README.md#backups) for testing a restore into a separate database.
