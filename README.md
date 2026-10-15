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

## Alışveriş akışı ve diller

Arayüz varsayılan olarak Türkçedir. Sağ üstten **Türkçe / English / Nederlands**
seçilebilir. Menü, düğmeler, yer tutucular, paylaşım ve hata/onay mesajları üç
dilde güncellenir. Yeni arayüz metinlerini `i18n.js` içinde üç dilde birlikte ekleyin.

1. İlk açılışta **Hesap oluştur** ile ad, e-posta ve şifre girin. Sonraki açılışlarda
   giriş hatırlanır. Oturum 90 gün geçerlidir; uygulama açılınca bu süre yenilenir.
   Çıkış yapmak veya tarayıcı verilerini silmek yeniden giriş gerektirir.
2. Market seçin, ürünleri ekleyin. Hesapla çalışırken değişiklikler otomatik kaydedilir.
   Birden fazla marketin ürünleri ayrı tutulur. Liste adı isteğe bağlıdır.
3. **Listeyi paylaş** ile kişinin e-postasını girin. İsterseniz “Ayşe” gibi bir adla
   hatırlatın. Sonraki paylaşımlarda kayıtlı kişiyi seçin veya adını yazın. Aynı adla
   birden fazla kişi varsa e-posta ile ayırt edilir.
4. Alıcının **aynı BuyMe sunucusunda hesabı olması gerekir**. Liste **Listelerim**
   alanında görünür; boş ekranda **Son halini yükle** ile yenilenebilir. Otomatik
   kontrol boşta yaklaşık 10 saniyede bir çalışır. Otomatik davet e-postası gönderilmez.
5. **Ayarlar** içinde tema (açık/koyu/sistem), renk, yazı boyutu, hesap ve yedekler
   bulunur. Görünüm ve dil tercihleri bu tarayıcıda hatırlanır.

- **Hesapsız, bu cihazda devam et** seçeneği yerel kullanım içindir. Hesap ve yerel
  listeler ayrı saklanır. Yerel liste hesaba otomatik aktarılmaz; Ayarlar’dan yedek
  dışa aktarıp giriş yaptıktan sonra içe aktarabilirsiniz. Tarayıcı verilerini
  silmek yerel listeleri siler. Paylaşılan bilgisayarda ayrı tarayıcı profili kullanın.
- Eski kullanıcı adı hesapları ve listeleri korunur. Eski kullanıcı adıyla giriş
  yapın; **Ayarlar → Hesap** altında e-posta ve mevcut şifrenizi girip Kaydet’e basın.
  Adınızı değiştirmek sahiplik veya yetki kazandırmaz.
- Şifreler scrypt ile özetlenir; oturum HttpOnly çerezinde tutulur. Bu yerel sunucu
  e-posta doğrulama veya şifre sıfırlama e-postası göndermez. E-posta doğrulaması
  eklenmeden güvenilmeyen kişilere açık bir kayıt hizmeti olarak yayımlamayın.
- Liste sahibi paylaşım yapabilir; üyeler ürünleri düzenleyebilir. Kayıtlı kişiler
  yalnızca onları kaydeden hesabın önerilerinde görünür.
- Çakışan değişiklikler cihazda korunur. Son halini yüklemeden önce dışa aktarın;
  sunucudaki liste sessizce üzerine yazılmaz. Bağlantı kesilince açık listedeki
  düzenlemeler yerelde kalır; bağlantı gelince **Eşitlemeyi tekrar dene** kullanılabilir.
- Konum alanı arayüzden kaldırılmıştır. Eski yedeklerdeki konum verisi korunur.

Ürünlerin soldaki noktalı tutamacını sürükleyerek sırasını değiştirebilirsiniz.
Bilgisayarda tutamaç odaktayken yukarı/aşağı ok tuşları da çalışır. Durum değişince
ürün yerinde kalır; elle belirlenen sıra kaydedilir ve paylaşılan listeyle eşitlenir.
Filtre açıkken yalnızca görünen ürünlerin yerleri değişir.

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
