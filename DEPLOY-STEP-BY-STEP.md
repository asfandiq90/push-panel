# push-panel — Beginner's deployment walkthrough

This is the hand-holding version for someone who has **never used a VPS before**.
Read it top to bottom. Every command has a short "what this does" so you're never
pasting things blindly.

`DEPLOY.md` is the short reference version. This file is the slow, explained one.

---

## What we're even doing (60-second concept primer)

- **VPS** = a computer you rent in a datacenter. It's always on and connected to
  the internet. Yours is at Hostinger. You control it by typing commands.
- **Terminal / command line** = a text window where you type commands instead of
  clicking buttons. The black window. That's all it is.
- **SSH** = the secure way to get a terminal *on the remote VPS* from your own PC.
- **Domain / DNS** = the internet's phonebook. `push.yourdomain.com` is a name;
  DNS maps that name to your server's IP number so browsers can find it.
- **The goal** = get our app running on the VPS, reachable at
  `https://push.yourdomain.com` with a padlock (HTTPS).

Throughout, replace these with your real values:

- `YOUR_SERVER_IP` → the IP from your Hostinger Overview page (e.g. `82.197.10.20`)
- `push.yourdomain.com` → the web address you want to use
- `you@yourdomain.com` → your email

---

## Step 1 — Find your server IP and log in

### 1a. Find the IP
hPanel → **VPS** → click your server → **Overview**. Copy the **IP address**.

### 1b. Get a terminal on the server (two options — pick ONE)

**Option A — Browser terminal (easiest, recommended for you):**
On that same VPS page, click **Browser terminal**. A black window opens, already
logged in as `root`. Done — skip to Step 2. Use this whenever the guide says
"run this on the server."

**Option B — SSH from your Windows PC:**
1. Press the Windows key, type **PowerShell**, open it.
2. Type this and press Enter (use your real IP):
   ```powershell
   ssh root@YOUR_SERVER_IP
   ```
3. First time only, it asks `Are you sure you want to continue connecting?` —
   type `yes` and Enter.
4. It asks for a password. This is your VPS **root password**.
   - You may have set it when creating the VPS.
   - If you don't know it: hPanel → VPS → your server → **Settings** →
     **Root password** (or **SSH access**) → set/reset it there, then use it.
   - Note: when typing a password in a terminal, **nothing shows** — no dots, no
     stars. That's normal. Type it and press Enter.

You're "on the server" when the prompt looks like `root@srv12345:~#`.

> Tip: you can right-click in PowerShell / the browser terminal to paste.

---

## Step 2 — (Optional) Reinstall Ubuntu for a clean start

Only if you want to wipe the VPS first (you said it's useless to you, so this is
fine). **This deletes everything on the VPS.**

hPanel → VPS → your server → **Settings** → **OS & Panel** (or **Operating
System**) → choose **Ubuntu 24.04 (or 22.04) without any panel** → confirm.

Wait a few minutes for it to finish, then log back in (Step 1b). If you skip this,
that's okay too — the commands below still work on a fresh Ubuntu VPS.

---

## Step 3 — Point your domain at the server

Do this early; DNS changes take a few minutes (sometimes longer) to take effect.

You need a domain. If you have one at Hostinger:

1. hPanel → **Domains** → your domain → **DNS / Nameservers** (DNS Zone editor).
2. Add a new record:
   - **Type:** `A`
   - **Name / Host:** `push`
   - **Points to / Value:** `YOUR_SERVER_IP`
   - **TTL:** leave default (e.g. 3600)
3. Save.

This creates `push.yourdomain.com`. (If your domain is registered somewhere else,
do the same "add an A record" thing in that registrar's DNS settings.)

**Check it worked** (run on your Windows PowerShell, not the server):
```powershell
nslookup push.yourdomain.com
```
When the answer shows `YOUR_SERVER_IP`, DNS is ready. If it still shows nothing or
an old value, wait 10–15 minutes and try again. Don't do Step 8 (HTTPS) until this
resolves.

---

## Step 4 — Install the software the app needs

From here on, **everything runs on the server** (Browser terminal, or your SSH
window). Paste one block at a time, press Enter, wait for it to finish.

### 4a. Update the system
```bash
apt update && apt upgrade -y
```
*What this does: refreshes the list of available software and installs updates.*
(If a purple/blue screen pops up about services to restart, just press Enter.)

### 4b. Install build tools, git, sqlite
```bash
apt install -y curl git build-essential python3 sqlite3 ufw
```
*What this does: installs the compilers our database module needs, plus `git` (to
download our code), `sqlite3` (for backups), and `ufw` (a firewall).*

### 4c. Add swap memory (prevents "out of memory" during the build on small VPS)
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
*What this does: gives the server 2 GB of emergency overflow memory so building
the app doesn't crash on a 1–2 GB plan.*

### 4d. Turn on the firewall
```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```
*What this does: only allows SSH (so you don't lock yourself out) and web traffic
(ports 80/443). Everything else is blocked.*

### 4e. Install Node.js 20 (the engine that runs the app)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
```
*The last line should print something like `v20.x.x`. If it does, Node is ready.*

---

## Step 5 — Get the app's code onto the server

The easiest beginner path is **GitHub** (a free website that stores code). You'll
put the code there once, then download it to the server with one command.

> The code contains **no secrets** — your passwords, keys, and the subscriber
> database are excluded automatically — so a public repo is fine and simplest.

### 5a. On your Windows PC: put the code on GitHub (using the GitHub Desktop app)
1. Make a free account at **github.com**.
2. Download and install **GitHub Desktop** (desktop.github.com) — it's a normal
   app with buttons, no commands.
3. Open GitHub Desktop → **File → Add local repository** → choose your
   `C:\Users\nofea\Documents\push-panel` folder.
4. If it says it's not a repository yet, click **create a repository** → **Create**.
5. Click **Publish repository** (top right). Untick "Keep this code private" if you
   want the simple public option → **Publish**.
6. Your code now lives at `https://github.com/YOUR_USERNAME/push-panel`.

### 5b. On the server: download it
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/push-panel.git
cd push-panel
```
*What this does: downloads your code into `/var/www/push-panel` and moves into
that folder. From now on, run server commands from inside this folder.*

---

## Step 6 — Install dependencies and create your settings

### 6a. Install the app's libraries
```bash
npm install
```
*What this does: downloads and compiles everything the app needs (this is the step
that builds the database module specifically for Linux — which is why we couldn't
just copy it from Windows). Takes a couple of minutes.*

### 6b. Generate your secret keys (run these one at a time, copy the output)
```bash
node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"
```
*Prints a public + private key pair. Copy the whole line somewhere for a moment.*

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
*Prints a long random string — your session secret. Copy it too.*

### 6c. Create the settings file
```bash
cp .env.production.example .env.local
nano .env.local
```
*This opens a simple text editor called **nano** showing the settings template.*

**How to use nano:**
- Move around with the **arrow keys** (you can't click).
- Type to edit.
- Fill in each value after the `=` sign:
  - `PANEL_BASE_URL=https://push.yourdomain.com`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=` → the **publicKey** from 6b
  - `VAPID_PRIVATE_KEY=` → the **privateKey** from 6b
  - `VAPID_SUBJECT=mailto:you@yourdomain.com`
  - `ADMIN_PASSWORD=` → make up a strong password (this is your dashboard login)
  - `SESSION_SECRET=` → the long random string from 6b
  - leave `PUSH_DB_PATH=./data/push-panel.db` as is
- Save: press **Ctrl+O**, then **Enter**.
- Exit: press **Ctrl+X**.

> The VAPID keys are a public/private pair like `{"publicKey":"AAA...","privateKey":"BBB..."}`.
> Put `AAA...` in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `BBB...` in `VAPID_PRIVATE_KEY`.

---

## Step 7 — Build and start the app

### 7a. Build it
```bash
npm run build
```
*Compiles the app for production. Wait for it to finish (you'll see a list of
routes and "Compiled successfully").*

### 7b. Install PM2 (keeps the app running 24/7 and restarts it after reboots)
```bash
npm install -g pm2
```

### 7c. Start the app
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```
*The last command prints **another command** — copy that printed line, paste it,
and press Enter. That's what makes the app auto-start if the server reboots.*

### 7d. Check it's alive
```bash
curl -I http://127.0.0.1:3000
```
*If you see `HTTP/1.1 200 OK` near the top, the app is running.* 

The app is now running, but only reachable *inside* the server. Next step gives it
a public HTTPS address.

---

## Step 8 — Turn on HTTPS with Caddy

Caddy is a web server that automatically gets you a free SSL certificate (the
padlock). **Make sure Step 3's `nslookup` already shows your IP before doing this.**

### 8a. Install Caddy
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 8b. Tell Caddy about your domain
```bash
nano /etc/caddy/Caddyfile
```
Delete everything in that file (hold **Ctrl+K** to cut lines), then type exactly:
```
push.yourdomain.com {
	reverse_proxy 127.0.0.1:3000
}
```
Save with **Ctrl+O**, Enter, then **Ctrl+X**.
*What this does: "when someone visits push.yourdomain.com, hand them the app
running on port 3000, and handle HTTPS automatically."*

### 8c. Reload Caddy
```bash
systemctl reload caddy
```

### 8d. Visit your site
Open a browser and go to **https://push.yourdomain.com**. You should see the panel,
with a padlock. Go to **https://push.yourdomain.com/dashboard** and log in with the
`ADMIN_PASSWORD` you set.

> If the page doesn't load: wait 1–2 minutes (Caddy is fetching the certificate),
> then refresh. If still stuck, see Troubleshooting at the bottom.

---

## Step 9 — Automatic nightly backups

Your subscribers live in one database file. Let's back it up every night.
```bash
cd /var/www/push-panel
sed -i 's/\r$//' scripts/backup.sh
chmod +x scripts/backup.sh
crontab -e
```
*The first time, `crontab -e` may ask you to choose an editor — pick `nano` (type
the number for nano, usually `1`, and Enter).*

Add this single line at the bottom, then save (Ctrl+O, Enter) and exit (Ctrl+X):
```
0 3 * * * /var/www/push-panel/scripts/backup.sh
```
*What this does: runs the backup every day at 3 AM. Backups are saved in
`/var/www/push-panel/backups/`.*

---

## Step 10 — You're live! Add your real websites

In the dashboard → **Domains** → **Add a domain** for each site you own
(e.g. `https://mp3juice.day`). Each gets its own install snippet. On each of your
sites:

1. Paste that domain's `<script>` snippet just before `</body>`.
2. Download `sw.js` from the panel and upload it to the **root** of that website
   (so it's reachable at `https://yoursite.com/sw.js`).
3. Add a button that calls `PushPanel.subscribe()`.

Visitors who click **Allow** become your subscribers. Then send them notifications
from **Campaigns**, or set up **Automation** to auto-push whenever you publish.

---

## Updating the app later (when we add Wave 3, etc.)

On your PC: GitHub Desktop → commit changes → **Push origin**.
On the server:
```bash
cd /var/www/push-panel
git pull
npm install
npm run build
pm2 restart push-panel
```
*Your settings (`.env.local`) and subscribers (`data/`) are never touched by
updates.*

---

## Troubleshooting (plain-English)

| What you see | What to do |
| --- | --- |
| `npm run build` says "Killed" | Out of memory — you skipped Step 4c (swap). Do it, then rebuild. |
| Site won't load over https | DNS not ready (re-check Step 3 `nslookup`), or wait 2 min for Caddy's cert. |
| "Wrong password" at login even though it's right | You're using `http://` — use the `https://` address. |
| Forgot which command to run | Re-read the step; commands are safe to run again. |
| Locked out / typo in firewall | Use the **Browser terminal** from hPanel — it always works even if SSH breaks. |
| App not running | `pm2 logs push-panel` shows errors; `pm2 restart push-panel` restarts it. |
| Notifications don't arrive on a site | Site must be https, `sw.js` at the site root, snippet's `data-vapid-key` must match that domain in the panel. |

When you get stuck on a specific step, copy the exact error text and send it to me —
I'll tell you precisely what to do next.
