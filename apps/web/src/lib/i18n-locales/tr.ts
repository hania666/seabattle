// Turkish (tr) translation dictionary. Keys must mirror those in i18n.ts (en).
// Game/crypto terms (SeaBattle, XP, PvP, PvE, Coins, Bomb, Radar, ETH,
// Easy/Normal/Hard, Юнга/Адмирал rank names) are kept untranslated.

export const dict: Record<string, string> = {
  // Branding
  "brand.name": "SeaBattle",
  "brand.tagline": "Yatır · Oyna · Talep et",
  "brand.era": "Closed Beta · Abstract Testnet",

  // Closed-beta banner
  "beta.badge": "Closed Beta · Testnet",
  "beta.copy": "Abstract Sepolia testnet — gerçek para yok, bakiyeler sıfırlanabilir.",
  "beta.banner.aria": "Closed beta duyurusu",
  "beta.dismiss.aria": "Kapat",

  // Network mismatch prompt
  "network.wrong": "Yanlış ağ — oynamak için {{chain}} ağına geç.",
  "network.switch": "Ağı değiştir",
  "network.switching": "Geçiliyor…",

  // Bug-report modal
  "nav.feedback": "Hata bildir",
  "feedback.title": "Hata bildir",
  "feedback.subtitle": "Ne olduğunu anlat. E-posta bırakırsan dönüş yaparız.",
  "feedback.message.label": "Ne ters gitti?",
  "feedback.message.placeholder": "Adımları ve beklediğin sonucu yaz…",
  "feedback.email.label": "E-posta",
  "feedback.email.optional": "(opsiyonel)",
  "feedback.attached.wallet": "Eklendi: cüzdan {{address}}",
  "feedback.success": "Teşekkürler — aldık.",
  "feedback.error": "Gönderilemedi. Birazdan tekrar dene.",
  "feedback.cancel": "İptal",
  "feedback.submit": "Gönder",
  "feedback.sending": "Gönderiliyor…",
  "feedback.close": "Kapat",

  // Nav / header
  "nav.home": "Ana sayfa",
  "nav.pve": "Bota karşı oyna",
  "nav.pvp": "PvP arenası",
  "nav.profile": "Profil",
  "nav.leaderboard": "Sıralama",
  "nav.shop": "Mağaza",
  "nav.settings": "Ayarlar",
  "nav.connect": "Bağlan",
  "nav.disconnect": "Bağlantıyı kes",
  "auth.signIn": "Giriş yap",
  "auth.signingIn": "Giriş yapılıyor…",

  // Home
  "home.title1": "SEA",
  "home.title2": "BATTLE",
  "home.pitch":
    "Yatır, oyna, talep et. Kazanan ödülün {{pct}} kısmını on-chain alır. PvE modu pratikte ücretsiz — sadece gas, botları yen, Юнга rütbesinden Адмирал rütbesine yüksel.",
  "home.cta.enter": "SAVAŞA GİR",
  "home.yourRank": "Rütben",
  "home.xpTo": "{{rank}} için {{n}} XP",
  "home.tile.pve.title": "BOTA KARŞI",
  "home.tile.pve.sub": "Ücretsiz XP, küçük ücret",
  "home.tile.pve.desc":
    "Easy ücretsiz. Normal/Hard testnet ETH cinsinden çok az tutar. Botu batır, XP biriktir, rütbe yüksel.",
  "home.tile.pve.cta": "OYNA",
  "home.tile.pvp.title": "PvP ARENA",
  "home.tile.pvp.sub": "Yatır · oyna · talep et",
  "home.tile.pvp.desc":
    "0.001 ile 0.01 ETH arası bahis seç. Kazanan ödülün %95'ini tek işlemde talep eder.",
  "home.tile.pvp.cta": "OLUŞTUR / KATIL",
  "home.tile.leaderboard.title": "SIRALAMA",
  "home.tile.leaderboard.sub": "Küresel rütbeler",
  "home.tile.leaderboard.desc":
    "XP'ye göre en iyi kaptanlar. Yerin her maçtan sonra güncellenir. Günlük ve tüm zamanlar tabloları.",
  "home.tile.leaderboard.cta": "GÖSTER",
  "home.tile.profile.title": "PROFİL",
  "home.tile.profile.sub": "İstatistik · Mağaza · Başarımlar",
  "home.tile.profile.desc":
    "Rütben, bakiyen, başarımların ve powerup mağazası — hepsi tek yerde.",
  "home.tile.profile.cta": "AÇ",

  // Settings modal
  "settings.title": "Ayarlar",
  "settings.close": "Ayarları kapat",
  "settings.sfx": "Ses efektleri",
  "settings.sfx.sub": "Atışlar, patlamalar, uyarılar",
  "settings.music": "Arka plan müziği",
  "settings.music.sub": "Ambient synth döngüsü",
  "settings.volume": "Genel ses",
  "settings.lang": "Dil",
  "settings.note":
    "Ses Web Audio sentezi kullanır — hiçbir şey indirilmez. Açtıktan sonra ses gelmiyorsa sayfaya bir kez tıkla.",

  // Fleet
  "fleet.afloat": "Su üstünde",
  "fleet.your": "Filon",
  "fleet.enemy": "Düşman filosu",
  "fleet.damaged": "Hasarlı",
  "fleet.sunk": "Battı",
  "ship.carrier": "Uçak gemisi",
  "ship.battleship": "Zırhlı",
  "ship.cruiser": "Kruvazör",
  "ship.submarine": "Denizaltı",
  "ship.destroyer": "Muhrip",

  // PvE
  "pve.title": "Bota karşı oyna",
  "pve.subtitle": "Abstract Sepolia · testnet ETH",
  "pve.playing": "Oynadığın",
  "pve.bot": "bot · {{level}}",
  "pve.yourTurn": "Sıra sende",
  "pve.botThinking": "Bot düşünüyor…",
  "pve.intro": "Vurursan tekrar at. Iskalarsan bot atar. Süreyi tüketme.",
  "pve.log": "Savaş günlüğü",
  "pve.yourShot": "Atışın",

  // Powerups (in-game bar)
  "pu.title": "Powerup'lar",
  "pu.none": "Powerup yok. Günlük kasayı al ya da mağazaya bak.",
  "pu.aim.bomb": "Bomba modu · 3×3 alana vurmak için bir hücreye tıkla",
  "pu.aim.radar": "Radar modu · 3×3 taramak için bir hücreye tıkla",
  "pu.cancel": "İptal",
  "pu.radarResult": "Radar: 3×3 içinde {{n}} gemi hücresi",
  "pu.radarClear": "Radar: temiz sular",
  "pu.locked.pvp": "Sadece PvP",
  "pu.locked.soon": "Yakında",

  // Splash
  "splash.tagline": "Yatır · Oyna · Talep et",
  "splash.enter": "Savaşa gir",

  // Shop
  "shop.title": "Gemi mağazası",
  "shop.subtitle": "Coins'i savaş powerup'larına harca",
  "shop.balance": "Coins",
  "shop.buy": "Satın al",
  "shop.owned": "Envanterde",
  "shop.need": "{{n}} daha gerek",
  "shop.full": "Envanter dolu ({{n}})",

  // Coins / rewards
  "coins.label": "Coins",
  "coins.earned": "+{{n}} Coins",
  "coins.migration.grant":
    "Hoş geldin bonusu: +{{n}} Coins. Coins, XP'den ayrı yeni bir oyun parası — mağazada harca.",

  // PvP mode selector
  "pvp.mode.title": "Maç formatı",
  "pvp.mode.classic.name": "Klasik",
  "pvp.mode.classic.badge": "Saf yetenek",
  "pvp.mode.classic.desc":
    "Powerup yok. Kazanan, yerleşim ve okuma ile belirlenir. Adil oyun için önerilir.",
  "pvp.mode.arcade.name": "Arcade",
  "pvp.mode.arcade.badge": "Yakında",
  "pvp.mode.arcade.desc":
    "Her iki oyuncu da envantere dokunmayan eşit bir başlangıç kiti (1 Bomb + 1 Radar) alır. Bir sonraki yamada gelecek.",

  // Rank / decay messaging (Profile)
  "rank.decay.inactivity":
    "Dikkat — {{days}} günden uzun maç oynamazsan, XP haftada {{per}} azalır.",
  "rank.decay.losing.streak":
    "Yenilgi serisi: {{n}}. Bir yenilgi daha sana {{penalty}} XP'ye mal olur.",
  "rank.decay.applied":
    "Hareketsizlik cezası uygulandı: −{{n}} XP. Sayacı sıfırlamak için bir maç oyna.",
  "shop.daily.title": "Günlük kasa",
  "shop.daily.desc": "Her 24 saatte bir ücretsiz Bomb + Radar. Mağazayı aç yeter.",
  "shop.daily.claim": "Bugünkü kasayı al",
  "shop.daily.claimed": "Alındı · {{h}}sa {{m}}dk sonra dön",
  "shop.bomb.name": "Bomba",
  "shop.bomb.desc": "Alan vuruşu — hedef hücrenin etrafındaki 3×3 kareye vurur.",
  "shop.radar.name": "Radar",
  "shop.radar.desc": "3×3'lük alanı tarar ve içinde kaç gemi hücresi olduğunu söyler (koordinat vermez).",
  "shop.torpedo.name": "Torpido",
  "shop.torpedo.desc": "Bir satır veya sütunun tamamını ateşler. İlk vurulan gemide durur.",
  "shop.shield.name": "Kalkan",
  "shop.shield.desc": "Filona sonradan gelen ilk vuruşu engeller (sadece PvP).",

  // Achievements
  "ach.section.title": "Başarımlar",
  "ach.section.subtitle": "{{n}}/{{total}} açıldı · {{coins}} Coins kazanıldı",
  "ach.locked": "Kilitli",
  "ach.unlocked": "Açıldı",
  "ach.reward": "+{{n}} 🪙",
  "ach.toast.title": "Başarım açıldı",
  "ach.toast.body": "{{title}} · +{{reward}} Coins",
  "ach.title.kraken": "Kraken",
  "ach.title.ghost": "Hayalet",
  "ach.title.admiral": "Filo amirali",
  "ach.firstBlood.title": "İlk kan",
  "ach.firstBlood.desc": "İlk gemini batır.",
  "ach.firstWin.title": "Açılış yaylımı",
  "ach.firstWin.desc": "İlk maçını kazan.",
  "ach.hundredMatches.title": "Komodor",
  "ach.hundredMatches.desc": "Toplam 100 maç oyna.",
  "ach.fiveHundredMatches.title": "Veteran",
  "ach.fiveHundredMatches.desc": "Toplam 500 maç oyna.",
  "ach.tenWinStreak.title": "Durdurulamaz",
  "ach.tenWinStreak.desc": "Üst üste 10 maç kazan.",
  "ach.ironFist.title": "Demir yumruk",
  "ach.ironFist.desc": "Powerup kullanmadan Hard'da kazan.",
  "ach.quickDraw.title": "Hızlı çekiş",
  "ach.quickDraw.desc": "Bir maçı 60 saniyenin altında bitir.",
  "ach.silentHunter.title": "Sessiz avcı",
  "ach.silentHunter.desc": "25 atış veya daha azıyla kazan.",
  "ach.blindSeer.title": "Kör görücü",
  "ach.blindSeer.desc": "Radar veya bomba kullanmadan kazan.",
  "ach.rankMatros.title": "Bayrağı çek",
  "ach.rankMatros.desc": "Матрос rütbesine ulaş.",
  "ach.rankMichman.title": "Subay yolu",
  "ach.rankMichman.desc": "Мичман rütbesine ulaş.",
  "ach.rankLieutenant.title": "Komuta köprüsü",
  "ach.rankLieutenant.desc": "Лейтенант rütbesine ulaş.",
  "ach.rankAdmiral.title": "Filo amirali",
  "ach.rankAdmiral.desc": "Адмирал rütbesine ulaş.",
  "ach.torpedoMaster.title": "Torpido ustası",
  "ach.torpedoMaster.desc": "10 torpido at.",
  "ach.bombMaster.title": "Yıkıcı",
  "ach.bombMaster.desc": "10 bomba bırak.",
  "ach.shieldBearer.title": "Kalkan taşıyıcısı",
  "ach.shieldBearer.desc": "5 kalkan kullan.",
  "ach.collector.title": "Koleksiyoncu",
  "ach.collector.desc": "Her powerup'tan en az bir tane satın al.",
  "ach.richCaptain.title": "Zengin kaptan",
  "ach.richCaptain.desc": "Aynı anda 1.000 Coins biriktir.",
  "ach.dailyRoutine.title": "Günlük rutin",
  "ach.dailyRoutine.desc": "7 günlük kasa al.",
  "ach.firstTryHard.title": "Acemi şansı",
  "ach.firstTryHard.desc": "Hard'da ilk denemede kazan.",

  // Legal
  "legal.gate.title": "Hızlı bir kontrol",
  "legal.gate.subtitle": "Oyuna girmeden önce",
  "legal.gate.intro":
    "SeaBattle yetenek bazlı bir oyundur. Ücretsiz oynayabilirsin (PvE Easy) ya da başka bir oyuncuya karşı testnet/gerçek ETH bahis koyabilirsin. Devam etmeden önce iki şeyi onayla.",
  "legal.gate.age.check": "En az 18 yaşındayım (veya yaşadığım yerde reşit yaşımdayım).",
  "legal.gate.tos.before": "Şunları okudum ve kabul ediyorum:",
  "legal.gate.tos.link": "Hizmet Şartları",
  "legal.gate.and": "ve",
  "legal.gate.privacy.link": "Gizlilik Politikası",
  "legal.gate.disclaimer":
    "SeaBattle, ABD'nin WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE eyaletlerinde, BAE / Singapur / Çin / Suudi Arabistan ve yaptırım uygulanan ülkelerde sunulmaz. Sorumlu oyna.",
  "legal.gate.accept": "SeaBattle'a gir",
  "legal.gate.help": "Sorumlu oyun yardımı",

  "legal.geo.sanctioned.title": "SeaBattle bölgende kullanılamıyor",
  "legal.geo.country.title": "SeaBattle ülkende kullanılamıyor",
  "legal.geo.state.title": "SeaBattle eyaletinde kullanılamıyor",
  "legal.geo.body":
    "IP adresine göre, gerçek para ile yetenek bahsi sunmadığımız bir bölgedesin. Bu karar kişisel değil — hizmeti yerel düzenleyici riskten korumak için.",
  "legal.geo.detected": "Tespit edildi",
  "legal.geo.disclaimer":
    "Bunun bir hata olduğunu düşünüyorsan (örneğin bu bölgelerden birinde çıkışı olan bir VPN üzerinden bağlısın), VPN'i kapatıp sayfayı yenile.",

  "footer.terms": "Şartlar",
  "footer.privacy": "Gizlilik",
  "footer.responsible": "Sorumlu oyun · 1-800-GAMBLER",
  "footer.tagline": "Yetenek oyunu · Non-custodial · 18+",

  // Common
  "common.back": "Geri",
  "common.home": "Ana sayfa",
  "common.cancel": "İptal",
  "common.confirm": "Onayla",
  "common.error": "Bir şeyler ters gitti",
};
