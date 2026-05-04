// German (de) translation dictionary. Keys must mirror those in i18n.ts (en).
// Game/crypto terms (SeaBattle, XP, PvP, PvE, Coins, Bomb, Radar, ETH,
// Easy/Normal/Hard, Юнга/Адмирал rank names) are kept untranslated.

export const dict: Record<string, string> = {
  // Branding
  "brand.name": "SeaBattle",
  "brand.tagline": "Einsetzen · Spielen · Auszahlen",
  "brand.era": "Closed Beta · Abstract Testnet",

  // Closed-beta banner
  "beta.badge": "Closed Beta · Testnet",
  "beta.copy": "Abstract Sepolia testnet — kein echtes Geld, Stände können zurückgesetzt werden.",
  "beta.banner.aria": "Hinweis zur Closed Beta",
  "beta.dismiss.aria": "Schließen",

  // Network mismatch prompt
  "network.wrong": "Falsches Netzwerk — wechsle zu {{chain}}, um zu spielen.",
  "network.switch": "Netzwerk wechseln",
  "network.switching": "Wechsle…",

  // Bug-report modal
  "nav.feedback": "Bug melden",
  "feedback.title": "Bug melden",
  "feedback.subtitle": "Erzähl uns, was passiert ist. Wir melden uns, wenn du eine E-Mail hinterlässt.",
  "feedback.message.label": "Was ist schiefgelaufen?",
  "feedback.message.placeholder": "Beschreibe die Schritte und was du erwartet hast…",
  "feedback.email.label": "E-Mail",
  "feedback.email.optional": "(optional)",
  "feedback.attached.wallet": "Angehängt: Wallet {{address}}",
  "feedback.success": "Danke — angekommen.",
  "feedback.error": "Senden fehlgeschlagen. Versuch es gleich nochmal.",
  "feedback.cancel": "Abbrechen",
  "feedback.submit": "Senden",
  "feedback.sending": "Senden…",
  "feedback.close": "Schließen",

  // Nav / header
  "nav.home": "Start",
  "nav.pve": "Gegen Bot spielen",
  "nav.pvp": "PvP-Arena",
  "nav.profile": "Profil",
  "nav.leaderboard": "Bestenliste",
  "nav.shop": "Shop",
  "nav.referrals": "Empfehlungen",
  "nav.settings": "Einstellungen",
  "nav.connect": "Verbinden",
  "nav.disconnect": "Trennen",
  "auth.signIn": "Anmelden",
  "auth.signingIn": "Anmeldung…",

  // Home
  "home.title1": "SEA",
  "home.title2": "BATTLE",
  "home.pitch":
    "Einsetzen, spielen, auszahlen. Der Gewinner nimmt {{pct}} des Pots on-chain. Der PvE-Modus ist praktisch kostenlos — nur Gas, schlag Bots, steig vom Юнга zum Адмирал auf.",
  "home.cta.enter": "IN DEN KAMPF",
  "home.yourRank": "Dein Rang",
  "home.xpTo": "{{n}} XP bis {{rank}}",
  "home.tile.pve.title": "GEGEN BOT",
  "home.tile.pve.sub": "Gratis-XP, kleinste Gebühr",
  "home.tile.pve.desc":
    "Easy ist gratis. Normal/Hard kosten Cent-Beträge in testnet ETH. Versenk den Bot, sammel XP, steig im Rang auf.",
  "home.tile.pve.cta": "SPIELEN",
  "home.tile.pvp.title": "PvP ARENA",
  "home.tile.pvp.sub": "Einsetzen · spielen · auszahlen",
  "home.tile.pvp.desc":
    "Wähle einen Einsatz von 0.001 bis 0.01 ETH. Der Gewinner holt 95 % des Pots in einer Transaktion.",
  "home.tile.pvp.cta": "ERSTELLEN / BEITRETEN",
  "home.tile.leaderboard.title": "BESTENLISTE",
  "home.tile.leaderboard.sub": "Globale Ränge",
  "home.tile.leaderboard.desc":
    "Top-Kapitäne nach XP. Dein Platz wird nach jedem Match aktualisiert. Tages- und Allzeit-Tabellen.",
  "home.tile.leaderboard.cta": "ANSEHEN",
  "home.tile.profile.title": "PROFIL",
  "home.tile.profile.sub": "Stats · Shop · Achievements",
  "home.tile.profile.desc":
    "Dein Rang, Guthaben, Achievements und der Powerup-Shop — alles an einem Ort.",
  "home.tile.profile.cta": "ÖFFNEN",

  // Settings modal
  "settings.title": "Einstellungen",
  "settings.close": "Einstellungen schließen",
  "settings.sfx": "Soundeffekte",
  "settings.sfx.sub": "Schüsse, Explosionen, Hinweise",
  "settings.music": "Hintergrundmusik",
  "settings.music.sub": "Ambient-Synth-Loop",
  "settings.volume": "Gesamtlautstärke",
  "settings.lang": "Sprache",
  "settings.note":
    "Sound nutzt Web Audio Synthese — es wird nichts heruntergeladen. Wenn du nichts hörst, klick einmal irgendwo auf die Seite.",

  // Fleet
  "fleet.afloat": "Schwimmt",
  "fleet.your": "Deine Flotte",
  "fleet.enemy": "Gegnerische Flotte",
  "fleet.damaged": "Beschädigt",
  "fleet.sunk": "Versenkt",
  "ship.carrier": "Flugzeugträger",
  "ship.battleship": "Schlachtschiff",
  "ship.cruiser": "Kreuzer",
  "ship.submarine": "U-Boot",
  "ship.destroyer": "Zerstörer",

  // PvE
  "pve.title": "Gegen Bot spielen",
  "pve.subtitle": "Abstract Sepolia · testnet ETH",
  "pve.playing": "Du spielst gegen",
  "pve.bot": "Bot · {{level}}",
  "pve.yourTurn": "Du bist dran",
  "pve.botThinking": "Bot überlegt…",
  "pve.intro": "Treffer = nochmal schießen. Daneben = Bot ist dran. Lass die Zeit nicht ablaufen.",
  "pve.log": "Kampfprotokoll",
  "pve.yourShot": "Dein Schuss",

  // Powerups (in-game bar)
  "pu.title": "Powerups",
  "pu.none": "Keine Powerups. Hol dir die Tageskiste oder schau in den Shop.",
  "pu.aim.bomb": "Bomben-Modus · Klick eine Zelle für 3×3-Treffer",
  "pu.aim.radar": "Radar-Modus · Klick eine Zelle für 3×3-Scan",
  "pu.cancel": "Abbrechen",
  "pu.radarResult": "Radar: {{n}} Schiffsfelder im 3×3",
  "pu.radarClear": "Radar: alles klar",
  "pu.locked.pvp": "Nur PvP",
  "pu.locked.soon": "Demnächst",

  // Splash
  "splash.tagline": "Einsetzen · Spielen · Auszahlen",
  "splash.enter": "In den Kampf",

  // Shop
  "shop.title": "Schiffs-Shop",
  "shop.subtitle": "Coins für Kampf-Powerups ausgeben",
  "shop.balance": "Coins",
  "shop.buy": "Kaufen",
  "shop.owned": "Im Inventar",
  "shop.need": "Noch {{n}} nötig",
  "shop.full": "Inventar voll ({{n}})",

  // Coins / rewards
  "coins.label": "Coins",
  "coins.earned": "+{{n}} Coins",
  "coins.migration.grant":
    "Willkommensbonus: +{{n}} Coins. Coins ist eine neue Spielwährung getrennt vom XP — gib sie im Shop aus.",

  // PvP mode selector
  "pvp.mode.title": "Match-Format",
  "pvp.mode.classic.name": "Classic",
  "pvp.mode.classic.badge": "Pures Können",
  "pvp.mode.classic.desc":
    "Keine Powerups. Der Gewinner wird durch Aufstellung und Lesen des Bretts entschieden. Empfohlen für faires Spiel.",
  "pvp.mode.arcade.name": "Arcade",
  "pvp.mode.arcade.badge": "Demnächst",
  "pvp.mode.arcade.desc":
    "Beide Spieler erhalten ein gleiches Starter-Kit (1 Bombe + 1 Radar), das das Inventar nicht berührt. Kommt im nächsten Patch.",

  // Rank / decay messaging (Profile)
  "rank.decay.inactivity":
    "Achtung — wenn du länger als {{days}} Tage nicht spielst, sinkt das XP um {{per}} pro Woche.",
  "rank.decay.losing.streak":
    "Niederlagenserie: {{n}}. Eine weitere Niederlage kostet dich {{penalty}} XP.",
  "rank.decay.applied":
    "Inaktivitäts-Abzug angewandt: −{{n}} XP. Spiel ein Match, um den Timer zurückzusetzen.",
  "shop.daily.title": "Tageskiste",
  "shop.daily.desc": "Gratis Bomb + Radar alle 24 Stunden. Einfach den Shop öffnen.",
  "shop.daily.claim": "Heutige Kiste abholen",
  "shop.daily.claimed": "Abgeholt · zurück in {{h}}h {{m}}m",
  "shop.bomb.name": "Bombe",
  "shop.bomb.desc": "Flächentreffer — trifft ein 3×3-Quadrat um die Zielzelle.",
  "shop.radar.name": "Radar",
  "shop.radar.desc": "Scannt ein 3×3-Feld und zeigt, wie viele Schiffsfelder darin sind (ohne Koordinaten).",
  "shop.torpedo.name": "Torpedo",
  "shop.torpedo.desc": "Feuert eine ganze Reihe oder Spalte. Stoppt beim ersten getroffenen Schiff.",
  "shop.shield.name": "Schild",
  "shop.shield.desc": "Blockt den nächsten Treffer auf deine Flotte (nur PvP).",

  // Achievements
  "ach.section.title": "Achievements",
  "ach.section.subtitle": "{{n}}/{{total}} freigeschaltet · {{coins}} Coins verdient",
  "ach.locked": "Gesperrt",
  "ach.unlocked": "Freigeschaltet",
  "ach.reward": "+{{n}} 🪙",
  "ach.toast.title": "Achievement freigeschaltet",
  "ach.toast.body": "{{title}} · +{{reward}} Coins",
  "ach.title.kraken": "Kraken",
  "ach.title.ghost": "Geist",
  "ach.title.admiral": "Flottenadmiral",
  "ach.firstBlood.title": "Erstes Blut",
  "ach.firstBlood.desc": "Versenke dein erstes Schiff.",
  "ach.firstWin.title": "Eröffnungssalve",
  "ach.firstWin.desc": "Gewinn dein erstes Match.",
  "ach.hundredMatches.title": "Kommodore",
  "ach.hundredMatches.desc": "Spiel insgesamt 100 Matches.",
  "ach.fiveHundredMatches.title": "Veteran",
  "ach.fiveHundredMatches.desc": "Spiel insgesamt 500 Matches.",
  "ach.tenWinStreak.title": "Unaufhaltsam",
  "ach.tenWinStreak.desc": "Gewinn 10 Matches in Folge.",
  "ach.ironFist.title": "Eiserne Faust",
  "ach.ironFist.desc": "Gewinn auf Hard ohne Powerup.",
  "ach.quickDraw.title": "Schnellschuss",
  "ach.quickDraw.desc": "Beend ein Match unter 60 Sekunden.",
  "ach.silentHunter.title": "Stiller Jäger",
  "ach.silentHunter.desc": "Gewinn ein Match mit 25 Schüssen oder weniger.",
  "ach.blindSeer.title": "Blinder Seher",
  "ach.blindSeer.desc": "Gewinn ohne Radar oder Bombe.",
  "ach.rankMatros.title": "Flagge hissen",
  "ach.rankMatros.desc": "Erreiche den Rang Matrose.",
  "ach.rankMichman.title": "Offizierslaufbahn",
  "ach.rankMichman.desc": "Erreiche den Rang Fähnrich.",
  "ach.rankLieutenant.title": "Kommandobrücke",
  "ach.rankLieutenant.desc": "Erreiche den Rang Leutnant.",
  "ach.rankAdmiral.title": "Admiral der Flotte",
  "ach.rankAdmiral.desc": "Erreiche den Rang Admiral.",

  // Naval rank labels (used by ranks.ts via labelKey).
  "rank.cabinBoy": "Schiffsjunge",
  "rank.sailor": "Matrose",
  "rank.bosun": "Bootsmann",
  "rank.midshipman": "Fähnrich",
  "rank.lieutenant": "Leutnant",
  "rank.commander": "Kapitänleutnant",
  "rank.captain": "Kapitän",
  "rank.admiral": "Admiral",
  "ach.torpedoMaster.title": "Torpedo-Meister",
  "ach.torpedoMaster.desc": "Feuere 10 Torpedos.",
  "ach.bombMaster.title": "Sprengmeister",
  "ach.bombMaster.desc": "Wirf 10 Bomben.",
  "ach.shieldBearer.title": "Schildträger",
  "ach.shieldBearer.desc": "Setz 5 Schilde ein.",
  "ach.collector.title": "Sammler",
  "ach.collector.desc": "Kauf mindestens eines jedes Powerups.",
  "ach.richCaptain.title": "Reicher Kapitän",
  "ach.richCaptain.desc": "Halte 1.000 Coins gleichzeitig.",
  "ach.dailyRoutine.title": "Tagesroutine",
  "ach.dailyRoutine.desc": "Hol 7 Tageskisten ab.",
  "ach.firstTryHard.title": "Anfängerglück",
  "ach.firstTryHard.desc": "Gewinn auf Hard beim ersten Versuch.",

  // Legal
  "legal.gate.title": "Eine kurze Prüfung",
  "legal.gate.subtitle": "Bevor du das Spiel betrittst",
  "legal.gate.intro":
    "SeaBattle ist ein skill-basiertes Spiel. Du kannst kostenlos spielen (PvE Easy) oder testnet/echtes ETH gegen einen anderen Spieler einsetzen. Bestätige zwei Dinge, bevor du weitermachst.",
  "legal.gate.age.check": "Ich bin mindestens 18 Jahre alt (oder volljährig nach meinem Wohnsitz).",
  "legal.gate.tos.before": "Ich habe die",
  "legal.gate.tos.link": "Nutzungsbedingungen",
  "legal.gate.and": "und",
  "legal.gate.privacy.link": "Datenschutzerklärung",
  "legal.gate.disclaimer":
    "SeaBattle ist nicht verfügbar in den US-Bundesstaaten WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE oder in den VAE / Singapur / China / Saudi-Arabien / sanktionierten Ländern. Spiel verantwortungsvoll.",
  "legal.gate.accept": "SeaBattle betreten",
  "legal.gate.help": "Hilfe zum verantwortungsvollen Spielen",

  "legal.geo.sanctioned.title": "SeaBattle ist in deiner Region nicht verfügbar",
  "legal.geo.country.title": "SeaBattle ist in deinem Land nicht verfügbar",
  "legal.geo.state.title": "SeaBattle ist in deinem Bundesstaat nicht verfügbar",
  "legal.geo.body":
    "Anhand deiner IP-Adresse befindest du dich in einer Region, in der wir keine echtgeld-basierten Skill-Wetten anbieten. Diese Entscheidung ist nicht persönlich — sie schützt den Dienst vor lokalen regulatorischen Risiken.",
  "legal.geo.detected": "Erkannt",
  "legal.geo.disclaimer":
    "Wenn du denkst, das ist ein Fehler (z. B. du bist über einen VPN-Exit-Knoten in einer dieser Regionen verbunden), deaktiviere das VPN und lade neu.",

  "footer.terms": "AGB",
  "footer.privacy": "Datenschutz",
  "footer.responsible": "Verantwortungsvolles Spielen · 1-800-GAMBLER",
  "footer.tagline": "Skill-Spiel · Non-custodial · 18+",

  // Username / rename
  "username.label": "Spielername",
  "username.notSet": "nicht gesetzt",
  "username.change": "Ändern",
  "username.save": "Speichern",
  "username.saving": "Speichern…",
  "username.cancel": "Abbrechen",
  "username.help": "3–20 Zeichen · Buchstaben, Ziffern, Unterstriche · beginnt mit Buchstabe.",
  "username.error.cooldown": "Du hast den Namen kürzlich geändert. Versuche es später.",
  "username.error.generic": "Aktualisierung fehlgeschlagen — Name vergeben oder ungültig.",
  "username.cooldown.next": "Nächste Änderung in {{when}}.",
  "username.cooldown.minutes": "{{n}} Min",
  "username.cooldown.hours": "{{n}} Std",
  "username.cooldown.days": "{{n}} T",
  "username.cooldown.ready": "jetzt",

  // Referrals
  "referrals.eyebrow": "Kapitänsgilde",
  "referrals.title": "Einladen & verdienen",
  "referrals.lead": "Lade Freunde mit deinem Link ein. Erhalte XP für jedes gewonnene PvE-Spiel und einen einmaligen Coin-Bonus beim ersten Spiel.",
  "referrals.connectPrompt": "Verbinde deine Abstract-Wallet, um deinen Link und deine Belohnungen zu sehen.",
  "referrals.linkTitle": "Dein Empfehlungslink",
  "referrals.linkHelp": "Teile diese URL. Wer sich darin verbindet, wird dein Geworbener — einmal pro Wallet.",
  "referrals.copy": "Kopieren",
  "referrals.copied": "Kopiert!",
  "referrals.codeLabel": "Code:",
  "referrals.stat.invited": "Eingeladene Kapitäne",
  "referrals.stat.xpEarned": "Erhaltene XP",
  "referrals.stat.coinsEarned": "Erhaltene Coins",
  "referrals.program.title": "So funktioniert es",
  "referrals.program.xp": "Du erhältst {{pct}}% XP aus jedem PvE-Sieg deiner Geworbenen, bis zu {{cap}} XP pro Geworbenem.",
  "referrals.program.coins": "+{{coins}} Coins einmalig, wenn ein Geworbener sein erstes PvE-Spiel gewinnt.",
  "referrals.list.title": "Deine Geworbenen",
  "referrals.list.empty": "Noch keine Geworbenen — teile deinen Link, um zu starten.",
  "referrals.list.error": "Geworbene konnten nicht geladen werden. Versuche es später.",
  "referrals.list.col.captain": "Kapitän",
  "referrals.list.col.joined": "Beigetreten",
  "referrals.list.col.firstMatch": "Erstes Spiel",

  // Common
  "common.back": "Zurück",
  "common.home": "Start",
  "common.cancel": "Abbrechen",
  "common.confirm": "Bestätigen",
  "common.error": "Etwas ist schiefgelaufen",
};
