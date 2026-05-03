// French (fr) translation dictionary. Keys must mirror those in i18n.ts (en).
// Game/crypto terms (SeaBattle, XP, PvP, PvE, Coins, Bomb, Radar, ETH,
// Easy/Normal/Hard, Юнга/Адмирал rank names) are kept untranslated.

export const dict: Record<string, string> = {
  // Branding
  "brand.name": "SeaBattle",
  "brand.tagline": "Mise · Joue · Réclame",
  "brand.era": "Closed Beta · Abstract Testnet",

  // Closed-beta banner
  "beta.badge": "Closed Beta · Testnet",
  "beta.copy": "Abstract Sepolia testnet — pas d'argent réel, les soldes peuvent être réinitialisés.",
  "beta.banner.aria": "Annonce de la closed beta",
  "beta.dismiss.aria": "Fermer",

  // Network mismatch prompt
  "network.wrong": "Mauvais réseau — passe sur {{chain}} pour jouer.",
  "network.switch": "Changer de réseau",
  "network.switching": "Changement…",

  // Bug-report modal
  "nav.feedback": "Signaler un bug",
  "feedback.title": "Signaler un bug",
  "feedback.subtitle": "Dis-nous ce qui s'est passé. On revient vers toi si tu laisses un email.",
  "feedback.message.label": "Qu'est-ce qui n'a pas marché ?",
  "feedback.message.placeholder": "Décris les étapes et ce que tu attendais…",
  "feedback.email.label": "Email",
  "feedback.email.optional": "(optionnel)",
  "feedback.attached.wallet": "Joint : wallet {{address}}",
  "feedback.success": "Merci — bien reçu.",
  "feedback.error": "Envoi impossible. Réessaie dans un moment.",
  "feedback.cancel": "Annuler",
  "feedback.submit": "Envoyer",
  "feedback.sending": "Envoi…",
  "feedback.close": "Fermer",

  // Nav / header
  "nav.home": "Accueil",
  "nav.pve": "Jouer contre bot",
  "nav.pvp": "Arène PvP",
  "nav.profile": "Profil",
  "nav.leaderboard": "Classement",
  "nav.shop": "Boutique",
  "nav.settings": "Paramètres",
  "nav.connect": "Connecter",
  "nav.disconnect": "Déconnecter",
  "auth.signIn": "Se connecter",
  "auth.signingIn": "Connexion…",

  // Home
  "home.title1": "SEA",
  "home.title2": "BATTLE",
  "home.pitch":
    "Mise, joue, réclame. Le gagnant prend {{pct}} du pot on-chain. Le mode PvE est quasi gratuit — juste le gas, bats les bots, monte de Юнга à Адмирал.",
  "home.cta.enter": "AU COMBAT",
  "home.yourRank": "Ton rang",
  "home.xpTo": "{{n}} XP jusqu'à {{rank}}",
  "home.tile.pve.title": "JOUER vs BOT",
  "home.tile.pve.sub": "XP gratuit, frais minimes",
  "home.tile.pve.desc":
    "Easy gratuit. Normal/Hard coûtent des centimes de testnet ETH. Coule le bot, accumule de l'XP, monte en grade.",
  "home.tile.pve.cta": "JOUER",
  "home.tile.pvp.title": "ARÈNE PvP",
  "home.tile.pvp.sub": "Mise · joue · réclame",
  "home.tile.pvp.desc":
    "Choisis une mise de 0.001 à 0.01 ETH. Le gagnant réclame 95 % du pot en une transaction.",
  "home.tile.pvp.cta": "CRÉER / REJOINDRE",
  "home.tile.leaderboard.title": "CLASSEMENT",
  "home.tile.leaderboard.sub": "Rangs mondiaux",
  "home.tile.leaderboard.desc":
    "Top capitaines par XP. Ta place se met à jour après chaque match. Tableaux quotidiens et all-time.",
  "home.tile.leaderboard.cta": "VOIR",
  "home.tile.profile.title": "PROFIL",
  "home.tile.profile.sub": "Stats · Boutique · Succès",
  "home.tile.profile.desc":
    "Ton rang, solde, succès et la boutique de powerups — tout au même endroit.",
  "home.tile.profile.cta": "OUVRIR",

  // Settings modal
  "settings.title": "Paramètres",
  "settings.close": "Fermer les paramètres",
  "settings.sfx": "Effets sonores",
  "settings.sfx.sub": "Tirs, explosions, alertes",
  "settings.music": "Musique de fond",
  "settings.music.sub": "Boucle synthé ambient",
  "settings.volume": "Volume principal",
  "settings.lang": "Langue",
  "settings.note":
    "Le son utilise la synthèse Web Audio — rien n'est téléchargé. Si tu n'entends rien après l'avoir activé, clique une fois sur la page.",

  // Fleet
  "fleet.afloat": "À flot",
  "fleet.your": "Ta flotte",
  "fleet.enemy": "Flotte ennemie",
  "fleet.damaged": "Endommagé",
  "fleet.sunk": "Coulé",
  "ship.carrier": "Porte-avions",
  "ship.battleship": "Cuirassé",
  "ship.cruiser": "Croiseur",
  "ship.submarine": "Sous-marin",
  "ship.destroyer": "Destroyer",

  // PvE
  "pve.title": "Jouer contre bot",
  "pve.subtitle": "Abstract Sepolia · testnet ETH",
  "pve.playing": "Tu joues contre",
  "pve.bot": "bot · {{level}}",
  "pve.yourTurn": "À toi de jouer",
  "pve.botThinking": "Le bot réfléchit…",
  "pve.intro": "Touché : tu rejoues. Manqué : à lui. Ne laisse pas le temps s'écouler.",
  "pve.log": "Journal de bataille",
  "pve.yourShot": "Ton tir",

  // Powerups (in-game bar)
  "pu.title": "Powerups",
  "pu.none": "Aucun powerup. Récupère la caisse quotidienne ou passe à la boutique.",
  "pu.aim.bomb": "Mode bombe · clique une case pour frapper en 3×3",
  "pu.aim.radar": "Mode radar · clique une case pour scanner en 3×3",
  "pu.cancel": "Annuler",
  "pu.radarResult": "Radar : {{n}} cases de bateau dans 3×3",
  "pu.radarClear": "Radar : eaux dégagées",
  "pu.locked.pvp": "PvP uniquement",
  "pu.locked.soon": "Bientôt",

  // Splash
  "splash.tagline": "Mise · Joue · Réclame",
  "splash.enter": "Au combat",

  // Shop
  "shop.title": "Boutique du navire",
  "shop.subtitle": "Dépense des Coins en powerups de combat",
  "shop.balance": "Coins",
  "shop.buy": "Acheter",
  "shop.owned": "En inventaire",
  "shop.need": "Il manque {{n}}",
  "shop.full": "Inventaire plein ({{n}})",

  // Coins / rewards
  "coins.label": "Coins",
  "coins.earned": "+{{n}} Coins",
  "coins.migration.grant":
    "Bonus de bienvenue : +{{n}} Coins. Coins est une nouvelle monnaie séparée de l'XP — dépense-les en boutique.",

  // PvP mode selector
  "pvp.mode.title": "Format de match",
  "pvp.mode.classic.name": "Classique",
  "pvp.mode.classic.badge": "Skill pur",
  "pvp.mode.classic.desc":
    "Pas de powerups. Le gagnant se décide par placement et lecture du plateau. Recommandé pour le fair-play.",
  "pvp.mode.arcade.name": "Arcade",
  "pvp.mode.arcade.badge": "Bientôt",
  "pvp.mode.arcade.desc":
    "Les deux joueurs reçoivent un kit identique (1 Bomb + 1 Radar) qui ne touche pas l'inventaire. Arrive au prochain patch.",

  // Rank / decay messaging (Profile)
  "rank.decay.inactivity":
    "Attention — si tu sautes plus de {{days}} jours, l'XP perd {{per}} par semaine.",
  "rank.decay.losing.streak":
    "Série de défaites : {{n}}. Une défaite de plus te coûtera {{penalty}} XP.",
  "rank.decay.applied":
    "Pénalité d'inactivité appliquée : −{{n}} XP. Joue un match pour reset le compteur.",
  "shop.daily.title": "Caisse quotidienne",
  "shop.daily.desc": "Bomb + Radar gratuits toutes les 24 heures. Ouvre simplement la boutique.",
  "shop.daily.claim": "Récupérer la caisse du jour",
  "shop.daily.claimed": "Récupérée · reviens dans {{h}}h {{m}}m",
  "shop.bomb.name": "Bombe",
  "shop.bomb.desc": "Frappe de zone — touche un carré 3×3 autour de la case ciblée.",
  "shop.radar.name": "Radar",
  "shop.radar.desc": "Scanne une zone 3×3 et indique combien de cases de bateau s'y trouvent (sans coordonnées).",
  "shop.torpedo.name": "Torpille",
  "shop.torpedo.desc": "Tire toute une ligne ou colonne. S'arrête au premier bateau touché.",
  "shop.shield.name": "Bouclier",
  "shop.shield.desc": "Bloque le prochain tir reçu sur ta flotte (PvP uniquement).",

  // Achievements
  "ach.section.title": "Succès",
  "ach.section.subtitle": "{{n}}/{{total}} débloqués · {{coins}} Coins gagnés",
  "ach.locked": "Verrouillé",
  "ach.unlocked": "Débloqué",
  "ach.reward": "+{{n}} 🪙",
  "ach.toast.title": "Succès débloqué",
  "ach.toast.body": "{{title}} · +{{reward}} Coins",
  "ach.title.kraken": "Kraken",
  "ach.title.ghost": "Fantôme",
  "ach.title.admiral": "Amiral de la flotte",
  "ach.firstBlood.title": "Premier sang",
  "ach.firstBlood.desc": "Coule ton premier bateau.",
  "ach.firstWin.title": "Salve d'ouverture",
  "ach.firstWin.desc": "Gagne ton premier match.",
  "ach.hundredMatches.title": "Commodore",
  "ach.hundredMatches.desc": "Joue 100 matchs au total.",
  "ach.fiveHundredMatches.title": "Vétéran",
  "ach.fiveHundredMatches.desc": "Joue 500 matchs au total.",
  "ach.tenWinStreak.title": "Imparable",
  "ach.tenWinStreak.desc": "Gagne 10 matchs d'affilée.",
  "ach.ironFist.title": "Poing de fer",
  "ach.ironFist.desc": "Gagne en Hard sans aucun powerup.",
  "ach.quickDraw.title": "Tir rapide",
  "ach.quickDraw.desc": "Termine un match en moins de 60 secondes.",
  "ach.silentHunter.title": "Chasseur silencieux",
  "ach.silentHunter.desc": "Gagne avec 25 tirs ou moins.",
  "ach.blindSeer.title": "Voyant aveugle",
  "ach.blindSeer.desc": "Gagne sans utiliser radar ni bombe.",
  "ach.rankMatros.title": "Hisser le drapeau",
  "ach.rankMatros.desc": "Atteins le rang Матрос.",
  "ach.rankMichman.title": "Voie d'officier",
  "ach.rankMichman.desc": "Atteins le rang Мичман.",
  "ach.rankLieutenant.title": "Pont de commandement",
  "ach.rankLieutenant.desc": "Atteins le rang Лейтенант.",
  "ach.rankAdmiral.title": "Amiral de la flotte",
  "ach.rankAdmiral.desc": "Atteins le rang Адмирал.",
  "ach.torpedoMaster.title": "Maître torpilleur",
  "ach.torpedoMaster.desc": "Tire 10 torpilles.",
  "ach.bombMaster.title": "Démolisseur",
  "ach.bombMaster.desc": "Lâche 10 bombes.",
  "ach.shieldBearer.title": "Porte-bouclier",
  "ach.shieldBearer.desc": "Utilise 5 boucliers.",
  "ach.collector.title": "Collectionneur",
  "ach.collector.desc": "Achète au moins un de chaque powerup.",
  "ach.richCaptain.title": "Capitaine riche",
  "ach.richCaptain.desc": "Détiens 1 000 Coins en même temps.",
  "ach.dailyRoutine.title": "Routine quotidienne",
  "ach.dailyRoutine.desc": "Récupère 7 caisses quotidiennes.",
  "ach.firstTryHard.title": "Chance du débutant",
  "ach.firstTryHard.desc": "Gagne en Hard du premier coup.",

  // Legal
  "legal.gate.title": "Une vérification rapide",
  "legal.gate.subtitle": "Avant d'entrer dans le jeu",
  "legal.gate.intro":
    "SeaBattle est un jeu de skill. Tu peux jouer gratuitement (PvE Easy) ou miser de l'ETH testnet/réel contre un autre joueur. Confirme deux choses avant de continuer.",
  "legal.gate.age.check": "J'ai au moins 18 ans (ou l'âge de la majorité dans mon pays).",
  "legal.gate.tos.before": "J'ai lu et j'accepte les",
  "legal.gate.tos.link": "Conditions d'utilisation",
  "legal.gate.and": "et",
  "legal.gate.privacy.link": "Politique de Confidentialité",
  "legal.gate.disclaimer":
    "SeaBattle n'est pas proposé dans les États américains de WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE, ni aux EAU / Singapour / Chine / Arabie Saoudite / pays sous sanctions. Joue de manière responsable.",
  "legal.gate.accept": "Entrer dans SeaBattle",
  "legal.gate.help": "Aide au jeu responsable",

  "legal.geo.sanctioned.title": "SeaBattle n'est pas disponible dans ta région",
  "legal.geo.country.title": "SeaBattle n'est pas disponible dans ton pays",
  "legal.geo.state.title": "SeaBattle n'est pas disponible dans ton État",
  "legal.geo.body":
    "D'après ton adresse IP, tu te trouves dans une juridiction où nous ne proposons pas de paris en argent réel. Cette décision n'est pas personnelle — elle protège le service du risque réglementaire local.",
  "legal.geo.detected": "Détecté",
  "legal.geo.disclaimer":
    "Si tu penses que c'est une erreur (par ex. tu es connecté via un VPN sortant dans une de ces régions), désactive le VPN et recharge.",

  "footer.terms": "Conditions",
  "footer.privacy": "Confidentialité",
  "footer.responsible": "Jeu responsable · 1-800-GAMBLER",
  "footer.tagline": "Jeu de skill · Non-custodial · 18+",

  // Common
  "common.back": "Retour",
  "common.home": "Accueil",
  "common.cancel": "Annuler",
  "common.confirm": "Confirmer",
  "common.error": "Quelque chose a mal tourné",
};
