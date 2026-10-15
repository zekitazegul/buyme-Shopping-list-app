# BuyMe

A local-first shopping list with an optional **self-hosted Node.js + SQLite**
sharing server. No Supabase, Firebase, hosted database subscription, runtime npm
dependency or third-party script is required. An internet connection is not
required to edit the list already loaded in a browser. Sharing needs the server.

## Run on the Windows computer

Install **Node.js 24 LTS or newer** from https://nodejs.org and reopen PowerShell.
Clone this repository, or pull it if already cloned:

```powershell
git clone https://github.com/zekitazegul/buyme-Shopping-list-app.git
cd buyme-Shopping-list-app
node --version
npm start
```

Open `http://localhost:3000`. Leave the PowerShell window and computer running.
The app's runtime uses only Node built-ins; `npm install` is not needed to run it.
For another device on the same trusted Wi-Fi:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Lan
ipconfig
```

Open `http://COMPUTER_IPV4:3000` on the phone. Allow Node on Windows Firewall's
**Private** network if Windows asks. The IP address is shown by `ipconfig`.
Do not expose port 3000 directly to the public internet. LAN HTTP is for trusted
local testing; passwords and cookies need HTTPS for remote use.

## Local and shared lists

The main screen includes product/market search, status filters, a shopping
progress indicator and confirmed bulk removal of purchased items. Account,
sharing and backup tools are under **Account & sharing**. Product and market
names can be edited by clicking them; status buttons cycle through pending,
purchased and not found.

- Local lists need no account. Browser storage survives reloads; Export/Import
  backup provides a portable JSON copy. Clearing browser data deletes local-only
  lists. Private-mode/storage restrictions are reported, not silently ignored.
- To share, each person creates an account on **this same BuyMe server**. The
  account username is 3–40 letters/numbers/dots/underscores/dashes. It is not an
  email address. Passwords are hashed with scrypt; there is no email/reset service.
- Log in, build a list and click **Share this list**. Add a registered person's
  username using **+ Invite**. This grants access immediately; no email is sent.
- The invited person uses **Load latest**, then selects the list under Shared
  lists. Products, statuses, market names, list name and location synchronize.
  Open lists refresh about every 10 seconds while idle. Reload also works manually.
- Both members may edit; only the owner may add people. Access checks run on the
  server. Changing a local display name does not grant ownership.
- Conflicting edits are kept locally and reported. Export them before choosing
  **Load latest** to replace them. Conflicts are never silently overwritten.
- Logout switches to the separate local/guest list. Account caches are separate.
  On shared computers, browser storage may still contain that account's cached
  data: use separate OS/browser profiles for private local caches.
- Offline edits to a previously loaded shared list stay on the device; use
  **Retry sync** when the server returns. Local guest lists are not auto-uploaded.

## Data and migration to another computer

The server creates `data/buyme.sqlite` (and WAL/SHM sidecars while running).
`BUYME_DB` can override the path. Data, backups and credentials are ignored by Git.
Make a consistent backup, including while the server is running:

```powershell
node .\scripts\backup.mjs
```

Copy the generated `backups/buyme-....sqlite` to secure storage. To migrate:

1. Make a backup and stop writes on the old server before the final backup.
2. Install Node.js 24+ and clone the same code on the new computer.
3. Stop the new server if running. Place the backup at `data/buyme.sqlite` (create
   the folder first). Do not mix old WAL/SHM files with a restored backup.
4. Start the new server. Accounts, memberships and shared lists move together.
5. Test login and lists, then update the access address. Browser-only guest lists
   need separate Export/Import. Never upload database files/backups to GitHub.

The old computer should sleep neither while in use nor during scheduled backups.
The next home-server stage should add HTTPS/private remote access, automatic
backups, update/restart management and a tested restore procedure. No public
remote access, firewall rule or startup service is installed automatically here.
For an HTTPS reverse proxy set `PUBLIC_ORIGIN=https://your-host` and
`NODE_ENV=production`; secure cookies are then required. Forward the real public
origin exactly. Runtime `HOST` defaults to `127.0.0.1`, `PORT` to `3000`.

## Development checks

```powershell
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Linux tests reuse `/usr/bin/chromium` when available. `BUYME_CHROMIUM` can select
another Chromium executable. Playwright is a dev dependency only. API tests use
isolated temporary/in-memory databases and do not touch the user's data.

## Existing Supabase prototype

The previous code only wrote a list name remotely; markets/products were local,
invitation was a placeholder and cloud lists were never loaded. The replacement
keeps legacy `buymeData` local lists, normalizes invalid/duplicate IDs and retains
an old Supabase list ID as `legacyListId` without reusing it on the new server.
Existing Supabase server data is not deleted or migrated automatically. Export
any additional data from that service before shutting it down if you need it.
