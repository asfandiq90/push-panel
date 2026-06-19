# Adding a new website to push-panel

Files in this folder:

- **`popup-snippet.html`** — the WordPress footer snippet (the LaraPush-style soft prompt). Open it in any text editor (Notepad, VS Code) — the instructions are at the very top.

## Sites already installed

| Site | Domain ID | VAPID key (first 12 chars) |
| --- | --- | --- |
| Dimitris Christopoulos | 2 | BL-_qNfc9cMv… |
| CelebTalksDaily | 3 | BCN1YFdXszyZ… |

(See the full keys at https://push.tradewithcandle.com/dashboard/domains)

## Quick reference: 5 steps per new site

1. Add the domain at https://push.tradewithcandle.com/dashboard/domains → copy the new VAPID key it generates.
2. Download https://push.tradewithcandle.com/sw.js → upload to the site's `public_html/` (root, not a subfolder).
3. Install **WPCode** plugin → paste `popup-snippet.html` into Header & Footer → Footer.
4. **Edit the two values** at the top of the `<script>` block:
   - `SITE_NAME` — your brand name
   - `VAPID` — the key from step 1 (just the bare key string, nothing else!)
5. Clear caches (WordPress + Hostinger + Cloudflare if used).

Test in an incognito window — popup should appear within ~1.2s.

## When to update this snippet

Whenever we change the popup design (different colors, copy, animation, etc.), the new version replaces `popup-snippet.html` here. Then update each live site to the new version.
