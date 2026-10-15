/* Every UI key has Turkish, English and Dutch text. Add all three for new features. */
(function(root) {
    'use strict';
    const catalog = {
  "Language": {
    "tr": "Dil",
    "en": "Language",
    "nl": "Taal"
  },
  "Settings": {
    "tr": "Ayarlar",
    "en": "Settings",
    "nl": "Instellingen"
  },
  "Storage warning": {
    "tr": "Tarayıcı kaydı kullanılamıyor veya bozulmuş. Sayfayı kapatmadan önce yedek dışa aktarın.",
    "en": "Browser storage is unavailable or damaged. Export a backup before closing this page.",
    "nl": "Browseropslag is niet beschikbaar of beschadigd. Exporteer een back-up voordat je de pagina sluit."
  },
  "Welcome": {
    "tr": "BuyMe’ye hoş geldin",
    "en": "Welcome",
    "nl": "Welkom bij BuyMe"
  },
  "Shop together": {
    "tr": "Alışveriş birlikte daha kolay.",
    "en": "Shop together",
    "nl": "Samen boodschappen doen is makkelijker."
  },
  "Welcome help": {
    "tr": "Bir kez giriş yap, listelerin hep yanında olsun. Marketini seç, ürünlerini ekle ve sevdiklerinle paylaş.",
    "en": "Sign in once and keep your lists handy. Choose a market, add products and share with people you know.",
    "nl": "Log één keer in en houd je lijsten bij de hand. Kies een winkel, voeg producten toe en deel je lijst."
  },
  "Login": {
    "tr": "Giriş yap",
    "en": "Login",
    "nl": "Inloggen"
  },
  "Create account": {
    "tr": "Hesap oluştur",
    "en": "Create account",
    "nl": "Account aanmaken"
  },
  "Your name": {
    "tr": "Adınız",
    "en": "Your name",
    "nl": "Je naam"
  },
  "Email or old username": {
    "tr": "E-posta veya eski kullanıcı adı",
    "en": "Email or old username",
    "nl": "E-mailadres of oude gebruikersnaam"
  },
  "Email": {
    "tr": "E-posta",
    "en": "Email",
    "nl": "E-mailadres"
  },
  "Password": {
    "tr": "Şifre",
    "en": "Password",
    "nl": "Wachtwoord"
  },
  "Continue locally": {
    "tr": "Hesapsız, bu cihazda devam et",
    "en": "Continue locally",
    "nl": "Zonder account op dit apparaat doorgaan"
  },
  "What do we need?": {
    "tr": "Neler alıyoruz?",
    "en": "What do we need?",
    "nl": "Wat hebben we nodig?"
  },
  "Shopping help": {
    "tr": "Marketini seç, ürünlerini ekle. Gerisini BuyMe hatırlasın.",
    "en": "Choose your market and add products. Let BuyMe remember the rest.",
    "nl": "Kies een winkel en voeg je producten toe. BuyMe onthoudt de rest."
  },
  "Share list": {
    "tr": "Listeyi paylaş",
    "en": "Share list",
    "nl": "Lijst delen"
  },
  "Choose a market": {
    "tr": "Market seç",
    "en": "Choose a market",
    "nl": "Kies een winkel"
  },
  "Other market": {
    "tr": "+ Başka market ekle",
    "en": "Other market",
    "nl": "+ Andere winkel toevoegen"
  },
  "Market name": {
    "tr": "Market adı",
    "en": "Market name",
    "nl": "Winkelnaam"
  },
  "Add": {
    "tr": "Ekle",
    "en": "Add",
    "nl": "Toevoegen"
  },
  "Cancel": {
    "tr": "Vazgeç",
    "en": "Cancel",
    "nl": "Annuleren"
  },
  "Add your products": {
    "tr": "Ürünlerini ekle",
    "en": "Add your products",
    "nl": "Voeg je producten toe"
  },
  "Product name": {
    "tr": "Ürün adı",
    "en": "Product name",
    "nl": "Productnaam"
  },
  "Product placeholder": {
    "tr": "Örn. süt, ekmek, domates…",
    "en": "E.g. milk, bread, tomatoes…",
    "nl": "Bijv. melk, brood, tomaten…"
  },
  "Rename": {
    "tr": "Adını değiştir",
    "en": "Rename",
    "nl": "Naam wijzigen"
  },
  "Delete market": {
    "tr": "Marketi sil",
    "en": "Delete market",
    "nl": "Winkel verwijderen"
  },
  "Clear purchased": {
    "tr": "Alınanları temizle",
    "en": "Clear purchased",
    "nl": "Gekochte producten wissen"
  },
  "Shopping progress": {
    "tr": "Alışveriş ilerlemesi",
    "en": "Shopping progress",
    "nl": "Voortgang boodschappen"
  },
  "Search products": {
    "tr": "Ürün ara",
    "en": "Search products",
    "nl": "Producten zoeken"
  },
  "Filter": {
    "tr": "Filtrele",
    "en": "Filter",
    "nl": "Filteren"
  },
  "All": {
    "tr": "Tümü",
    "en": "All",
    "nl": "Alles"
  },
  "To buy": {
    "tr": "Alınacak",
    "en": "To buy",
    "nl": "Te kopen"
  },
  "Pending": {
    "tr": "Alınacak",
    "en": "Pending",
    "nl": "Te kopen"
  },
  "Purchased": {
    "tr": "Alındı",
    "en": "Purchased",
    "nl": "Gekocht"
  },
  "Not found": {
    "tr": "Bulunamadı",
    "en": "Not found",
    "nl": "Niet gevonden"
  },
  "Products": {
    "tr": "Ürünler",
    "en": "Products",
    "nl": "Producten"
  },
  "Name your list (optional)": {
    "tr": "Listeye isim ver (isteğe bağlı)",
    "en": "Name your list (optional)",
    "nl": "Geef je lijst een naam (optioneel)"
  },
  "List name": {
    "tr": "Liste adı",
    "en": "List name",
    "nl": "Lijstnaam"
  },
  "List name example": {
    "tr": "Örn. haftalık alışveriş",
    "en": "E.g. weekly shopping",
    "nl": "Bijv. wekelijkse boodschappen"
  },
  "Save": {
    "tr": "Kaydet",
    "en": "Save",
    "nl": "Opslaan"
  },
  "My lists": {
    "tr": "Listelerim",
    "en": "My lists",
    "nl": "Mijn lijsten"
  },
  "New list": {
    "tr": "+ Yeni liste",
    "en": "New list",
    "nl": "+ Nieuwe lijst"
  },
  "Save to account": {
    "tr": "Hesabıma kaydet",
    "en": "Save to account",
    "nl": "Opslaan in mijn account"
  },
  "Load latest": {
    "tr": "Son halini yükle",
    "en": "Load latest",
    "nl": "Nieuwste versie laden"
  },
  "Retry sync": {
    "tr": "Eşitlemeyi tekrar dene",
    "en": "Retry sync",
    "nl": "Opnieuw synchroniseren"
  },
  "Close": {
    "tr": "Kapat",
    "en": "Close",
    "nl": "Sluiten"
  },
  "Share help": {
    "tr": "E-posta adresini gir veya daha önce kaydettiğin birini seç. Karşı tarafın aynı BuyMe sunucusunda hesabı olmalı. E-posta gönderilmez.",
    "en": "Enter an email or choose a saved contact. The recipient needs an account on this same BuyMe server. No email is sent.",
    "nl": "Vul een e-mailadres in of kies een opgeslagen contact. De ander moet een account op dezelfde BuyMe-server hebben. Er wordt geen e-mail verstuurd."
  },
  "Email or saved name": {
    "tr": "E-posta veya kayıtlı kişi adı",
    "en": "Email or saved name",
    "nl": "E-mailadres of opgeslagen naam"
  },
  "Remember as (optional)": {
    "tr": "Şu adla hatırla (isteğe bağlı)",
    "en": "Remember as (optional)",
    "nl": "Onthouden als (optioneel)"
  },
  "Name example": {
    "tr": "Örn. Ayşe",
    "en": "E.g. Ayşe",
    "nl": "Bijv. Ayşe"
  },
  "Share": {
    "tr": "Paylaş",
    "en": "Share",
    "nl": "Delen"
  },
  "People with access": {
    "tr": "Listeye erişen kişiler",
    "en": "People with access",
    "nl": "Mensen met toegang"
  },
  "Appearance": {
    "tr": "Görünüm",
    "en": "Appearance",
    "nl": "Weergave"
  },
  "Theme": {
    "tr": "Tema",
    "en": "Theme",
    "nl": "Thema"
  },
  "Light": {
    "tr": "Açık",
    "en": "Light",
    "nl": "Licht"
  },
  "Dark": {
    "tr": "Koyu",
    "en": "Dark",
    "nl": "Donker"
  },
  "System": {
    "tr": "Sistem",
    "en": "System",
    "nl": "Systeem"
  },
  "Color": {
    "tr": "Renk",
    "en": "Color",
    "nl": "Kleur"
  },
  "Purple": {
    "tr": "Mor",
    "en": "Purple",
    "nl": "Paars"
  },
  "Green": {
    "tr": "Yeşil",
    "en": "Green",
    "nl": "Groen"
  },
  "Blue": {
    "tr": "Mavi",
    "en": "Blue",
    "nl": "Blauw"
  },
  "Rose": {
    "tr": "Pembe",
    "en": "Rose",
    "nl": "Roze"
  },
  "Text size": {
    "tr": "Yazı boyutu",
    "en": "Text size",
    "nl": "Tekstgrootte"
  },
  "Normal": {
    "tr": "Normal",
    "en": "Normal",
    "nl": "Normaal"
  },
  "Large": {
    "tr": "Büyük",
    "en": "Large",
    "nl": "Groot"
  },
  "Account": {
    "tr": "Hesap",
    "en": "Account",
    "nl": "Account"
  },
  "Legacy help": {
    "tr": "Eski hesabın korunuyor. E-posta ile giriş ve paylaşım için e-postanı ve mevcut şifreni gir, ardından Kaydet’e bas.",
    "en": "Your existing account is preserved. Enter an email and your current password, then Save, to use email for login and sharing.",
    "nl": "Je bestaande account blijft behouden. Vul je e-mailadres en huidige wachtwoord in en klik op Opslaan om e-mail te gebruiken voor inloggen en delen."
  },
  "Current password": {
    "tr": "Mevcut şifre",
    "en": "Current password",
    "nl": "Huidig wachtwoord"
  },
  "Logout": {
    "tr": "Çıkış yap",
    "en": "Logout",
    "nl": "Uitloggen"
  },
  "Backups": {
    "tr": "Yedekler",
    "en": "Backups",
    "nl": "Back-ups"
  },
  "Export backup": {
    "tr": "Yedeği dışa aktar",
    "en": "Export backup",
    "nl": "Back-up exporteren"
  },
  "Import backup": {
    "tr": "Yedek içe aktar",
    "en": "Import backup",
    "nl": "Back-up importeren"
  },
  "Hello {name}": {
    "tr": "Merhaba, {name} 👋",
    "en": "Hello, {name} 👋",
    "nl": "Hallo, {name} 👋"
  },
  "Local mode": {
    "tr": "Bu cihazda kullanım",
    "en": "Local mode",
    "nl": "Gebruik op dit apparaat"
  },
  "Shopping list": {
    "tr": "Alışveriş listesi",
    "en": "Shopping list",
    "nl": "Boodschappenlijst"
  },
  "Choose a list": {
    "tr": "Bir liste seç…",
    "en": "Choose a list…",
    "nl": "Kies een lijst…"
  },
  "{done} of {total} purchased": {
    "tr": "{total} üründen {done} tanesi alındı",
    "en": "{done} of {total} purchased",
    "nl": "{done} van {total} gekocht"
  },
  "Owner": {
    "tr": "Sahibi",
    "en": "Owner",
    "nl": "Eigenaar"
  },
  "Member": {
    "tr": "Üye",
    "en": "Member",
    "nl": "Lid"
  },
  "Local list help": {
    "tr": "Bu liste henüz paylaşılmadı.",
    "en": "This list has not been shared yet.",
    "nl": "Deze lijst is nog niet gedeeld."
  },
  "No products yet": {
    "tr": "Henüz ürün yok. Yukarıdan ilk ürününü ekle.",
    "en": "No products yet. Add your first product above.",
    "nl": "Nog geen producten. Voeg hierboven je eerste product toe."
  },
  "No matching products": {
    "tr": "Eşleşen ürün yok. Aramayı veya filtreyi değiştir.",
    "en": "No matching products. Change your search or filter.",
    "nl": "Geen passende producten. Pas je zoekopdracht of filter aan."
  },
  "Delete": {
    "tr": "Sil",
    "en": "Delete",
    "nl": "Verwijderen"
  },
  "New name": {
    "tr": "Yeni ad",
    "en": "New name",
    "nl": "Nieuwe naam"
  },
  "Edit product": {
    "tr": "Ürünü düzenle",
    "en": "Edit product",
    "nl": "Product bewerken"
  },
  "Change status of {name}: {status}": {
    "tr": "{name} durumunu değiştir: {status}",
    "en": "Change status of {name}: {status}",
    "nl": "Status van {name} wijzigen: {status}"
  },
  "Delete {name}?": {
    "tr": "{name} silinsin mi?",
    "en": "Delete {name}?",
    "nl": "{name} verwijderen?"
  },
  "Delete market {name} with {count} products?": {
    "tr": "{name} marketi ve içindeki {count} ürün silinsin mi?",
    "en": "Delete {name} and its {count} products?",
    "nl": "Winkel {name} met {count} producten verwijderen?"
  },
  "Clear purchased?": {
    "tr": "Bu listedeki alınmış ürünler silinsin mi?",
    "en": "Remove all purchased products from this list?",
    "nl": "Alle gekochte producten uit deze lijst verwijderen?"
  },
  "CONFLICT": {
    "tr": "Başka bir kişi bu listeyi değiştirdi. Değişikliklerin bu cihazda korundu. Son halini yüklemeden önce yedek dışa aktar.",
    "en": "Another member changed this list. Your changes are kept on this device. Export a backup before loading the latest version.",
    "nl": "Iemand anders heeft deze lijst gewijzigd. Je wijzigingen zijn op dit apparaat bewaard. Exporteer een back-up voordat je de nieuwste versie laadt."
  },
  "Connection error": {
    "tr": "Sunucuya ulaşılamıyor. Bu cihazdaki değişikliklerin korundu. Bağlantını kontrol edip tekrar dene.",
    "en": "The server is unavailable. Your changes are kept on this device. Check the connection and try again.",
    "nl": "De server is niet bereikbaar. Je wijzigingen zijn op dit apparaat bewaard. Controleer je verbinding en probeer opnieuw."
  },
  "Server offline": {
    "tr": "Sunucuya ulaşılamıyor. Kayıtlı oturumun varsa bağlantı gelince geri yüklenecek; şimdilik bu cihazda devam edebilirsin.",
    "en": "The server is unavailable. An existing session will be restored when the connection returns; you can continue locally for now.",
    "nl": "De server is niet bereikbaar. Een bestaande sessie wordt hersteld zodra de verbinding terug is; je kunt nu op dit apparaat doorgaan."
  },
  "Waiting to sync": {
    "tr": "Bu cihaza kaydedildi, eşitlenmesi bekleniyor.",
    "en": "Saved on this device; waiting to sync.",
    "nl": "Op dit apparaat opgeslagen; wacht op synchronisatie."
  },
  "Syncing": {
    "tr": "Eşitleniyor…",
    "en": "Syncing…",
    "nl": "Bezig met synchroniseren…"
  },
  "Up to date": {
    "tr": "Liste güncel.",
    "en": "List is up to date.",
    "nl": "Lijst is bijgewerkt."
  },
  "Confirm replace": {
    "tr": "Eşitlenmemiş değişikliklerin değiştirilsin mi? Korumak için önce yedek dışa aktar.",
    "en": "Replace unsynced changes? Export a backup first to keep them.",
    "nl": "Niet-gesynchroniseerde wijzigingen vervangen? Exporteer eerst een back-up om ze te bewaren."
  },
  "Changed while loading": {
    "tr": "Yükleme sırasında listeyi düzenledin. Değişikliklerin korundu; hazır olduğunda tekrar dene.",
    "en": "You edited this list while it was loading. Your changes were preserved; try again when ready.",
    "nl": "Je hebt de lijst tijdens het laden aangepast. Je wijzigingen zijn bewaard; probeer het opnieuw wanneer je klaar bent."
  },
  "Recovered edits": {
    "tr": "Eşitlenmemiş değişikliklerin geri yüklendi. Eşitlemeyi tekrar dene veya yedek dışa aktar.",
    "en": "Unsynced changes recovered. Retry sync or export a backup.",
    "nl": "Niet-gesynchroniseerde wijzigingen zijn hersteld. Probeer opnieuw te synchroniseren of exporteer een back-up."
  },
  "Signed in": {
    "tr": "Giriş yapıldı.",
    "en": "Signed in",
    "nl": "Ingelogd."
  },
  "Signing in": {
    "tr": "Giriş yapılıyor…",
    "en": "Signing in…",
    "nl": "Bezig met inloggen…"
  },
  "Creating account": {
    "tr": "Hesap oluşturuluyor…",
    "en": "Creating account…",
    "nl": "Account wordt aangemaakt…"
  },
  "Logged out": {
    "tr": "Çıkış yapıldı. Bu cihazdaki liste gösteriliyor.",
    "en": "Logged out. The local list is shown.",
    "nl": "Uitgelogd. De lokale lijst wordt getoond."
  },
  "Confirm logout": {
    "tr": "Eşitlenmemiş değişikliklerin bu hesap için cihazda korunacak. Çıkış yapılsın mı?",
    "en": "Unsynced changes remain on this device for this account. Log out?",
    "nl": "Niet-gesynchroniseerde wijzigingen blijven voor dit account op dit apparaat bewaard. Uitloggen?"
  },
  "Profile saved": {
    "tr": "Hesap bilgileri kaydedildi.",
    "en": "Profile saved",
    "nl": "Accountgegevens opgeslagen."
  },
  "List saved": {
    "tr": "Liste hesabına kaydedildi.",
    "en": "List saved to your account.",
    "nl": "Lijst in je account opgeslagen."
  },
  "Shared with {name}": {
    "tr": "Liste {name} ile paylaşıldı. Kişiyi bir sonraki paylaşımda seçebilirsin.",
    "en": "List shared with {name}. You can select this contact next time.",
    "nl": "Lijst gedeeld met {name}. Je kunt dit contact de volgende keer selecteren."
  },
  "Sync first": {
    "tr": "Paylaşmadan önce bekleyen değişikliklerini eşitle veya yedekle.",
    "en": "Sync or export pending changes before sharing.",
    "nl": "Synchroniseer of exporteer je wijzigingen voordat je deelt."
  },
  "Wait for sync": {
    "tr": "Liste değiştirmeden önce eşitlemenin bitmesini bekle.",
    "en": "Wait for synchronization before switching lists.",
    "nl": "Wacht op de synchronisatie voordat je van lijst wisselt."
  },
  "Confirm switch": {
    "tr": "Bu cihazdaki mevcut listenin yerine seçtiğin liste açılacak. Gerekirse önce yedekle. Devam edilsin mi?",
    "en": "The selected list will replace the current local list. Export a backup first if needed. Continue?",
    "nl": "De gekozen lijst vervangt de huidige lokale lijst. Maak eerst een back-up als je deze wilt bewaren. Doorgaan?"
  },
  "Confirm new list": {
    "tr": "Yeni liste açılsın mı? Mevcut listeyi saklamak için önce hesabına kaydet veya yedekle.",
    "en": "Start a new list? Save the current list to your account or export a backup first to keep it.",
    "nl": "Nieuwe lijst openen? Sla de huidige lijst eerst op in je account of maak een back-up om deze te bewaren."
  },
  "Resolve conflict": {
    "tr": "Değişikliklerini dışa aktar, ardından Son halini yükle ile çakışmayı çöz.",
    "en": "Export your changes, then load the latest version to resolve the conflict.",
    "nl": "Exporteer je wijzigingen en laad daarna de nieuwste versie om het conflict op te lossen."
  },
  "Backup too large": {
    "tr": "Yedek çok büyük (en fazla 1 MB).",
    "en": "Backup is too large (maximum 1 MB).",
    "nl": "Back-up is te groot (maximaal 1 MB)."
  },
  "Invalid backup": {
    "tr": "Bu dosya geçerli bir BuyMe yedeği değil.",
    "en": "This file is not a valid BuyMe backup.",
    "nl": "Dit bestand is geen geldige BuyMe-back-up."
  },
  "Confirm import": {
    "tr": "Yedek mevcut listenin yerine açılsın mı? Gerekirse önce mevcut listeyi kaydet veya yedekle.",
    "en": "Open this backup instead of the current list? Save or back up the current list first if needed.",
    "nl": "Back-up openen in plaats van de huidige lijst? Sla de huidige lijst eerst op of maak een back-up indien nodig."
  },
  "Backup imported": {
    "tr": "Yedek bu cihaza aktarıldı.",
    "en": "Backup imported",
    "nl": "Back-up op dit apparaat geïmporteerd."
  },
  "Other tab changed": {
    "tr": "Bu liste başka bir sekmede değişti. Yenilemeden önce değişikliklerini yedekle.",
    "en": "This list changed in another tab. Back up your edits before refreshing.",
    "nl": "Deze lijst is in een ander tabblad gewijzigd. Maak een back-up van je wijzigingen voordat je vernieuwt."
  },
  "Login to share": {
    "tr": "Paylaşmak için önce giriş yap.",
    "en": "Please log in to share.",
    "nl": "Log eerst in om te delen."
  },
  "Owner only": {
    "tr": "Bu listeye yalnızca sahibi kişi ekleyebilir.",
    "en": "Only the owner can add people to this list.",
    "nl": "Alleen de eigenaar kan mensen aan deze lijst toevoegen."
  },
  "EMAIL_INVALID": {
    "tr": "Geçerli bir e-posta adresi gir.",
    "en": "Enter a valid email address.",
    "nl": "Vul een geldig e-mailadres in."
  },
  "NAME_INVALID": {
    "tr": "Ad 1–80 karakter olmalı.",
    "en": "Use a name with 1–80 characters.",
    "nl": "De naam moet 1–80 tekens bevatten."
  },
  "PASSWORD_LENGTH": {
    "tr": "Şifre 8–200 karakter olmalı.",
    "en": "Use a password with 8–200 characters.",
    "nl": "Het wachtwoord moet 8–200 tekens bevatten."
  },
  "PASSWORD_REQUIRED": {
    "tr": "Mevcut şifreni gir.",
    "en": "Enter your current password.",
    "nl": "Vul je huidige wachtwoord in."
  },
  "EMAIL_TAKEN": {
    "tr": "Bu e-posta adresiyle bir hesap zaten var. Giriş yapabilirsin.",
    "en": "An account with this email already exists. Please log in.",
    "nl": "Er bestaat al een account met dit e-mailadres. Je kunt inloggen."
  },
  "LOGIN_INVALID": {
    "tr": "E-posta/kullanıcı adı veya şifre hatalı.",
    "en": "Invalid email/username or password.",
    "nl": "E-mailadres/gebruikersnaam of wachtwoord is onjuist."
  },
  "CONTACT_NOT_FOUND": {
    "tr": "Bu kişi bulunamadı. E-postasını kontrol et; aynı BuyMe sunucusunda hesabı olmalı. Kayıtlı adla aramak için önce bir kez e-postayla paylaş.",
    "en": "Contact not found. Check the email; the person needs an account on this BuyMe server. Share by email first to remember their name.",
    "nl": "Deze persoon is niet gevonden. Controleer het e-mailadres; een account op dezelfde BuyMe-server is nodig. Deel eerst via e-mail om daarna op opgeslagen naam te zoeken."
  },
  "CONTACT_AMBIGUOUS": {
    "tr": "Aynı adla birden fazla kişi var. E-posta adresini yaz veya önerilen kişiyi seç.",
    "en": "More than one contact has this name. Enter an email or choose a suggested contact.",
    "nl": "Er zijn meerdere contacten met deze naam. Vul het e-mailadres in of kies een voorgesteld contact."
  },
  "UNAUTHORIZED": {
    "tr": "Oturumun sona ermiş. Yeniden giriş yap.",
    "en": "Your session has expired. Please log in again.",
    "nl": "Je sessie is verlopen. Log opnieuw in."
  },
  "REQUEST_ERROR": {
    "tr": "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.",
    "en": "The action could not be completed. Check the details and try again.",
    "nl": "De actie is niet voltooid. Controleer de gegevens en probeer opnieuw."
  },
  "Too many sign-in attempts. Try again later.": {
    "tr": "Çok fazla giriş denemesi. Bir süre sonra tekrar dene.",
    "en": "Too many sign-in attempts. Try again later.",
    "nl": "Te veel inlogpogingen. Probeer het later opnieuw."
  }
};
    let language = 'tr';
    const t = (key, values = {}) => {
        const source = catalog[key]?.[language] ?? key;
        return source.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
    };
    function setLanguage(value) { language = ['tr','en','nl'].includes(value) ? value : 'tr'; }
    const api = { t, setLanguage, get language() { return language; }, catalog };
    root.BuyMeI18n = api;
    if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
