# Deploying push-panel to a Hostinger VPS

This walks you from a fresh Ubuntu VPS to a live, HTTPS push panel at
`https://push.yourdomain.com`.

**Key fact:** `better-sqlite3` is a native module compiled per-OS. You **cannot**
copy `node_modules` from Windows to Linux — the app is built *on the VPS*.

Replace these placeholders throughout:

- `push.yourdomain.com` → your real (sub)domain
- `YOUR_SERVER_IP` → the VPS public IP (Hostinger panel → VPS → Overview)
- `you@yourdomain.com` → your email

---

## 0. Point a domain at the VPS (do this first — DNS takes time to propagate)

In your domain's DNS settings (Hostinger hPanel → Domains → DNS, or wherever the
domain is registered), add an **A record**:

| Type | Name   | Value          | TTL  |
| ---- | ------ | -------------- | ---- |
| A    | `push` | `YOUR_SERVER_IP` | 3600 |

That gives you `push.yourdomain.com`. Verify after a few minutes:

```bash
nslookup push.yourdomain.com      # should return YOUR_SERVER_IP
```

Don't continue to the Caddy/HTTPS step until this resolves.

---

## 1. Reset / prepare the VPS

In Hostinger hPanel you can reinstall the OS. Choose **Ubuntu 24.04 (or 22.04)**.
Then SSH in:

```bash
ssh root@YOUR_SERVER_IP
```

Update and install the build tools `better-sqlite3` needs to compile, plus git
and sqlite3 (for backups):

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential python3 sqlite3 ufw
```

### Add swap (recommended on 1–2 GB VPS so `next build` doesn't run out of memory)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

The app listens only on `127.0.0.1:3000` (not exposed publicly); traffic reaches
it through Caddy on 80/443.

---

## 2. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should print v20.x
```

---

## 3. Get the code onto the server

**Option A — GitHub (recommended, makes future updates a `git pull`):**

On your Windows machine, push the project to a **private** GitHub repo
(`.gitignore` already excludes `node_modules`, `.next`, `.env*`, and `/data`).
Then on the VPS:

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/YOUR_USERNAME/push-panel.git
cd push-panel
```

**Option B — rsync from Windows (PowerShell, no GitHub):**

```powershell
# Run from the push-panel folder on Windows. Requires OpenSSH (built into Win 11).
# Excludes the things that must NOT travel.
scp -r `
  (Get-ChildItem -Force -Exclude node_modules,.next,.git,data,.env.local) `
  root@YOUR_SERVER_IP:/var/www/push-panel/
```

(If `scp` of a filtered set is fiddly, just zip the folder without
`node_modules`/`.next`/`data`, upload the zip, and unzip into
`/var/www/push-panel`.)

---

## 4. Configure environment

```bash
cd /var/www/push-panel
cp .env.production.example .env.local
nano .env.local
```

Fill it in. Generate the secrets **on the server**:

```bash
# install deps first so web-push is available for key generation
npm install

# VAPID keypair:
node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"

# session secret:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste those into `.env.local`, set `PANEL_BASE_URL=https://push.yourdomain.com`,
a strong `ADMIN_PASSWORD`, and your `VAPID_SUBJECT` email. Save.

> The default "demo" domain row is auto-seeded from these env keys on first run,
> using `PANEL_BASE_URL` as its origin — so set that correctly before first launch.

---

## 5. Build

```bash
npm run build
```

(If it gets killed for memory on a tiny VPS, the swap from step 1 fixes it.)

---

## 6. Run it under PM2 (keeps it alive + starts on reboot)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd      # then run the command it prints
```

Check it's up locally:

```bash
curl -I http://127.0.0.1:3000      # expect HTTP/1.1 200 OK
pm2 logs push-panel --lines 30     # you should see the Next.js start + scheduler
```

> **Do not** switch PM2 to cluster mode / multiple instances. The scheduler runs
> in-process; multiple copies would double-send notifications.

---

## 7. HTTPS with Caddy (automatic Let's Encrypt)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Set the Caddyfile (uses the example in this repo as a template):

```bash
# edit the domain inside, then install it
cp /var/www/push-panel/Caddyfile.example /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile          # change push.yourdomain.com
systemctl reload caddy
```

Caddy will fetch a TLS cert automatically (needs the DNS A record from step 0 and
ports 80/443 open). Now visit:

```
https://push.yourdomain.com
```

You should see the panel. Go to `https://push.yourdomain.com/dashboard`, log in
with `ADMIN_PASSWORD`.

> HTTPS is **required** — the admin login cookie is `Secure` in production, and
> browser push notifications only work over HTTPS.

---

## 8. Nightly database backups

```bash
cd /var/www/push-panel
sed -i 's/\r$//' scripts/backup.sh   # strip any Windows CRLF line endings
chmod +x scripts/backup.sh
crontab -e
# add this line (3am daily):
0 3 * * * /var/www/push-panel/scripts/backup.sh
```

Backups land in `/var/www/push-panel/backups/` (gzipped, 14-day retention). The
`data/push-panel.db` file is your entire subscriber + campaign history — consider
also copying backups off-server periodically (e.g. `rclone` to cloud storage).

---

## 9. Add your real websites

In the dashboard → **Domains** → add each site (e.g. `https://mp3juice.day`).
Each gets its own VAPID keypair and an install page. On each site:

1. Copy that domain's `<script>` snippet just before `</body>`.
2. Download `sw.js` from the panel and host it at the **root** of that site
   (`https://mp3juice.day/sw.js`) — service workers can't load cross-origin.
3. Wire `PushPanel.subscribe()` to a button (or call it on a prompt).

Then visitors who click Allow flow into your panel, tagged by domain, and you can
push to them from **Campaigns** or auto-push new posts via **Automation**.

---

## Updating later

```bash
cd /var/www/push-panel
git pull                # (Option A) or re-upload changed files
npm install             # only if dependencies changed
npm run build
pm2 restart push-panel
```

Your `data/` (subscribers) and `.env.local` are untouched by updates.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `next build` killed | Add swap (step 1). |
| `better-sqlite3` errors on install | Ensure `build-essential python3` installed; re-run `npm install`. |
| Caddy can't get a cert | DNS A record not propagated yet, or 80/443 blocked. Check `nslookup` + `ufw status`. |
| Login says wrong password but it's right | You're on `http://`, not `https://` — the Secure cookie won't set. Use the https URL. |
| Notifications don't arrive | Site must be HTTPS, `sw.js` at site root, and the snippet's `data-vapid-key` must match that domain's key in the panel. |
| Scheduler not firing | `pm2 logs push-panel` — confirm single instance, fork mode. |
