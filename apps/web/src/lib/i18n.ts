/**
 * Tiny in-house i18n — no runtime library, just a dictionary + pub/sub +
 * `useT()` hook. Keys are period-free snake-ish strings grouped by domain.
 * Interpolation is `{{name}}` style, handled by `formatTemplate()`.
 *
 * Why not react-i18next? Bundle cost, config surface, and we only need 3
 * languages with ~120 strings.
 */

import { useSyncExternalStore } from "react";

export type Lang = "en" | "ru" | "uk";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
];

const LS_KEY = "sea3battle:lang:v1";

const dictionaries: Record<Lang, Record<string, string>> = {
  en: {
    // Branding
    "brand.name": "SeaBattle",
    "brand.tagline": "Stake · Play · Claim",
    "brand.era": "Closed Beta · Abstract Testnet",

    // Closed-beta banner
    "beta.badge": "Closed Beta · Testnet",
    "beta.copy": "Abstract Sepolia testnet — no real money, balances may be reset.",
    "beta.banner.aria": "Closed beta announcement",
    "beta.dismiss.aria": "Dismiss",

    // Network mismatch prompt
    "network.wrong": "Wrong network — switch to {{chain}} to play.",
    "network.switch": "Switch network",
    "network.switching": "Switching…",

    // Bug-report modal
    "nav.feedback": "Report a bug",
    "feedback.title": "Report a bug",
    "feedback.subtitle": "Tell us what happened. We'll follow up if you leave an email.",
    "feedback.message.label": "What went wrong?",
    "feedback.message.placeholder": "Describe the steps and what you expected to happen…",
    "feedback.email.label": "Email",
    "feedback.email.optional": "(optional)",
    "feedback.attached.wallet": "Attached: wallet {{address}}",
    "feedback.success": "Thanks — we got it.",
    "feedback.error": "Couldn't send. Try again in a moment.",
    "feedback.cancel": "Cancel",
    "feedback.submit": "Send",
    "feedback.sending": "Sending…",
    "feedback.close": "Close",

    // Nav / header
    "nav.home": "Home",
    "nav.pve": "Play vs bot",
    "nav.pvp": "PvP arena",
    "nav.profile": "Profile",
    "nav.leaderboard": "Leaderboard",
    "nav.shop": "Shop",
    "nav.settings": "Settings",
    "nav.connect": "Connect",
    "nav.disconnect": "Disconnect",
    "auth.signIn": "Sign in",
    "auth.signingIn": "Signing in…",

    // Home
    "home.title1": "SEA",
    "home.title2": "BATTLE",
    "home.pitch":
      "Stake, play, claim. Winner takes {{pct}} of the pot on-chain. PvE mode is practically free — just gas, beat bots, climb from Юнга to Адмирал.",
    "home.cta.enter": "ENTER BATTLE",
    "home.yourRank": "Your rank",
    "home.xpTo": "{{n}} XP to {{rank}}",
    "home.tile.pve.title": "PLAY vs BOT",
    "home.tile.pve.sub": "Free XP, dust fee",
    "home.tile.pve.desc":
      "Easy is free. Normal/Hard cost pennies of testnet ETH. Sink the bot, rack up XP, rank up.",
    "home.tile.pve.cta": "PLAY",
    "home.tile.pvp.title": "PvP ARENA",
    "home.tile.pvp.sub": "Stake · play · claim",
    "home.tile.pvp.desc":
      "Pick a stake from 0.001 to 0.01 ETH. Winner claims 95 % of the pot with one transaction.",
    "home.tile.pvp.cta": "HOST / JOIN",
    "home.tile.leaderboard.title": "LEADERBOARD",
    "home.tile.leaderboard.sub": "Global ranks",
    "home.tile.leaderboard.desc":
      "Top captains ranked by XP. Your spot updates after every match. Daily & all-time boards.",
    "home.tile.leaderboard.cta": "VIEW",
    "home.tile.profile.title": "PROFILE",
    "home.tile.profile.sub": "Stats · Shop · Achievements",
    "home.tile.profile.desc":
      "Your rank, balance, achievements and the powerup shop — all in one place.",
    "home.tile.profile.cta": "OPEN",

    // Settings modal
    "settings.title": "Settings",
    "settings.close": "Close settings",
    "settings.sfx": "Sound effects",
    "settings.sfx.sub": "Shots, explosions, alerts",
    "settings.music": "Background music",
    "settings.music.sub": "Ambient synth loop",
    "settings.volume": "Master volume",
    "settings.lang": "Language",
    "settings.note":
      "Sound uses Web Audio synthesis — nothing is downloaded. If you don't hear anything after toggling on, click somewhere on the page once.",

    // Fleet
    "fleet.afloat": "Afloat",
    "fleet.your": "Your fleet",
    "fleet.enemy": "Enemy fleet",
    "fleet.damaged": "Damaged",
    "fleet.sunk": "Sunk",
    "ship.carrier": "Carrier",
    "ship.battleship": "Battleship",
    "ship.cruiser": "Cruiser",
    "ship.submarine": "Submarine",
    "ship.destroyer": "Destroyer",

    // PvE
    "pve.title": "Play vs bot",
    "pve.subtitle": "Abstract Sepolia · testnet ETH",
    "pve.playing": "Playing",
    "pve.bot": "{{level}} bot",
    "pve.yourTurn": "Your turn",
    "pve.botThinking": "Bot thinking…",
    "pve.intro": "Hit to keep firing. Miss and the bot gets its turn. Don't run out of time.",
    "pve.log": "Battle log",
    "pve.yourShot": "Your shot",

    // Powerups (in-game bar)
    "pu.title": "Powerups",
    "pu.none": "No powerups. Claim the daily crate or visit the shop.",
    "pu.aim.bomb": "Bomb mode · click a cell to strike a 3×3 area",
    "pu.aim.radar": "Radar mode · click a cell to scan 3×3",
    "pu.cancel": "Cancel",
    "pu.radarResult": "Radar: {{n}} ship cells in 3×3",
    "pu.radarClear": "Radar: clear waters",
    "pu.locked.pvp": "PvP only",
    "pu.locked.soon": "Coming soon",

    // Splash
    "splash.tagline": "Stake · Play · Claim",
    "splash.enter": "Enter battle",

    // Shop
    "shop.title": "Ship shop",
    "shop.subtitle": "Spend Coins on battle powerups",
    "shop.balance": "Coins",
    "shop.buy": "Buy",
    "shop.owned": "Owned",
    "shop.need": "Need {{n}} more",
    "shop.full": "Inventory full ({{n}})",

    // Coins / rewards
    "coins.label": "Coins",
    "coins.earned": "+{{n}} Coins",
    "coins.migration.grant":
      "Welcome bonus: +{{n}} Coins. Coins are a new in-game currency separate from XP — spend them in the shop.",

    // PvP mode selector
    "pvp.mode.title": "Match format",
    "pvp.mode.classic.name": "Classic",
    "pvp.mode.classic.badge": "Pure skill",
    "pvp.mode.classic.desc":
      "No powerups. Winner is decided by placement and reads only. Recommended for fair play.",
    "pvp.mode.arcade.name": "Arcade",
    "pvp.mode.arcade.badge": "Coming soon",
    "pvp.mode.arcade.desc":
      "Both players receive a matching starter kit (1 Bomb + 1 Radar) that does not touch inventory. Ships next patch.",

    // Rank / decay messaging (Profile)
    "rank.decay.inactivity":
      "Heads up — if you skip matches for more than {{days}} days, XP starts bleeding by {{per}} per week.",
    "rank.decay.losing.streak":
      "Losing streak: {{n}}. One more loss will cost you {{penalty}} XP.",
    "rank.decay.applied":
      "Inactivity decay applied: −{{n}} XP. Play a match to reset the timer.",
    "shop.daily.title": "Daily crate",
    "shop.daily.desc": "Free Bomb + Radar every 24 hours. Just open the shop.",
    "shop.daily.claim": "Claim today's crate",
    "shop.daily.claimed": "Claimed · come back in {{h}}h {{m}}m",
    "shop.bomb.name": "Bomb",
    "shop.bomb.desc": "Area strike — hits a 3×3 square around the target cell.",
    "shop.radar.name": "Radar",
    "shop.radar.desc": "Scan a 3×3 area to see how many ship cells are inside (no coords).",
    "shop.torpedo.name": "Torpedo",
    "shop.torpedo.desc": "Fires a whole row or column. Stops at the first ship hit.",
    "shop.shield.name": "Shield",
    "shop.shield.desc": "Blocks the next shot landed on your fleet (PvP only).",

    // Achievements
    "ach.section.title": "Achievements",
    "ach.section.subtitle": "{{n}}/{{total}} unlocked · {{coins}} Coins earned",
    "ach.locked": "Locked",
    "ach.unlocked": "Unlocked",
    "ach.reward": "+{{n}} 🪙",
    "ach.toast.title": "Achievement unlocked",
    "ach.toast.body": "{{title}} · +{{reward}} Coins",
    "ach.title.kraken": "Kraken",
    "ach.title.ghost": "Ghost",
    "ach.title.admiral": "Fleet Admiral",
    "ach.firstBlood.title": "First blood",
    "ach.firstBlood.desc": "Sink your first ship.",
    "ach.firstWin.title": "Opening salvo",
    "ach.firstWin.desc": "Win your first match.",
    "ach.hundredMatches.title": "Commodore",
    "ach.hundredMatches.desc": "Play 100 matches total.",
    "ach.fiveHundredMatches.title": "Veteran",
    "ach.fiveHundredMatches.desc": "Play 500 matches total.",
    "ach.tenWinStreak.title": "Unstoppable",
    "ach.tenWinStreak.desc": "Win 10 matches in a row.",
    "ach.ironFist.title": "Iron fist",
    "ach.ironFist.desc": "Win on Hard without any powerup.",
    "ach.quickDraw.title": "Quick draw",
    "ach.quickDraw.desc": "Finish a match in under 60 seconds.",
    "ach.silentHunter.title": "Silent hunter",
    "ach.silentHunter.desc": "Win a match using 25 shots or less.",
    "ach.blindSeer.title": "Blind seer",
    "ach.blindSeer.desc": "Win without using radar or bomb.",
    "ach.rankMatros.title": "Hoist the flag",
    "ach.rankMatros.desc": "Reach Матрос rank.",
    "ach.rankMichman.title": "Officer track",
    "ach.rankMichman.desc": "Reach Мичман rank.",
    "ach.rankLieutenant.title": "Command bridge",
    "ach.rankLieutenant.desc": "Reach Лейтенант rank.",
    "ach.rankAdmiral.title": "Admiral of the Fleet",
    "ach.rankAdmiral.desc": "Reach the Адмирал rank.",
    "ach.torpedoMaster.title": "Torpedo master",
    "ach.torpedoMaster.desc": "Fire 10 torpedoes.",
    "ach.bombMaster.title": "Demolitionist",
    "ach.bombMaster.desc": "Drop 10 bombs.",
    "ach.shieldBearer.title": "Shield bearer",
    "ach.shieldBearer.desc": "Use 5 shields.",
    "ach.collector.title": "Collector",
    "ach.collector.desc": "Purchase at least one of every powerup.",
    "ach.richCaptain.title": "Rich captain",
    "ach.richCaptain.desc": "Hold 1,000 Coins at once.",
    "ach.dailyRoutine.title": "Daily routine",
    "ach.dailyRoutine.desc": "Claim 7 daily crates.",
    "ach.firstTryHard.title": "Beginner's luck",
    "ach.firstTryHard.desc": "Win on Hard on your first try.",

    // Legal
    "legal.gate.title": "One quick check",
    "legal.gate.subtitle": "Before you enter the game",
    "legal.gate.intro":
      "SeaBattle is a skill-based game. You can play for free (PvE Easy) or stake testnet/real ETH against another player. Please confirm two things before you continue.",
    "legal.gate.age.check": "I am at least 18 years old (or the age of majority where I live).",
    "legal.gate.tos.before": "I have read and agree to the",
    "legal.gate.tos.link": "Terms of Service",
    "legal.gate.and": "and",
    "legal.gate.privacy.link": "Privacy Policy",
    "legal.gate.disclaimer":
      "SeaBattle is not offered in the US states of WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE, or in UAE / Singapore / China / Saudi Arabia / sanctioned countries. Play responsibly.",
    "legal.gate.accept": "Enter SeaBattle",
    "legal.gate.help": "Responsible gaming help",

    "legal.geo.sanctioned.title": "SeaBattle is not available in your region",
    "legal.geo.country.title": "SeaBattle is not available in your country",
    "legal.geo.state.title": "SeaBattle is not available in your state",
    "legal.geo.body":
      "Based on your IP address, you are in a jurisdiction where we do not offer real-money skill wagering. This decision is not about you personally — it protects the service from local regulatory risk.",
    "legal.geo.detected": "Detected",
    "legal.geo.disclaimer":
      "If you believe this is a mistake (e.g. you are connected through a VPN exit node in one of these regions), disable the VPN and reload.",

    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.responsible": "Responsible gaming · 1-800-GAMBLER",
    "footer.tagline": "Skill game · Non-custodial · 18+",

    // Common
    "common.back": "Back",
    "common.home": "Home",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.error": "Something went wrong",
  },

  ru: {
    "brand.name": "SeaBattle",
    "brand.tagline": "Ставка · Игра · Клейм",
    "brand.era": "Закрытая бета · Abstract Testnet",

    "beta.badge": "Закрытая бета · Testnet",
    "beta.copy": "Abstract Sepolia testnet — реальных денег нет, балансы могут сброситься.",
    "beta.banner.aria": "Уведомление о закрытой бете",
    "beta.dismiss.aria": "Скрыть",

    "network.wrong": "Неверная сеть — переключитесь на {{chain}}, чтобы играть.",
    "network.switch": "Переключить сеть",
    "network.switching": "Переключаем…",

    "nav.feedback": "Сообщить о баге",
    "feedback.title": "Сообщить о баге",
    "feedback.subtitle": "Расскажите, что случилось. Если оставите email — ответим.",
    "feedback.message.label": "Что пошло не так?",
    "feedback.message.placeholder": "Опишите шаги и что вы ожидали увидеть…",
    "feedback.email.label": "Email",
    "feedback.email.optional": "(необязательно)",
    "feedback.attached.wallet": "Прикреплено: кошелёк {{address}}",
    "feedback.success": "Спасибо — получили.",
    "feedback.error": "Не получилось отправить. Попробуйте позже.",
    "feedback.cancel": "Отмена",
    "feedback.submit": "Отправить",
    "feedback.sending": "Отправляем…",
    "feedback.close": "Закрыть",

    "nav.home": "Главная",
    "nav.pve": "Играть с ботом",
    "nav.pvp": "PvP арена",
    "nav.profile": "Профиль",
    "nav.leaderboard": "Лидерборд",
    "nav.shop": "Магазин",
    "nav.settings": "Настройки",
    "nav.connect": "Подключить",
    "nav.disconnect": "Отключить",
    "auth.signIn": "Войти",
    "auth.signingIn": "Подпись…",

    "home.title1": "SEA",
    "home.title2": "BATTLE",
    "home.pitch":
      "Ставишь, играешь, забираешь. Победитель получает {{pct}} банка on-chain. PvE режим практически бесплатный — только газ, бьёшь ботов, растёшь от Юнги до Адмирала.",
    "home.cta.enter": "В БОЙ",
    "home.yourRank": "Твой ранг",
    "home.xpTo": "{{n}} XP до {{rank}}",
    "home.tile.pve.title": "ИГРАТЬ С БОТОМ",
    "home.tile.pve.sub": "Бесплатный XP",
    "home.tile.pve.desc":
      "Easy бесплатно. Normal/Hard — копейки тестнет-ETH. Топи бота, копи XP, расти в звании.",
    "home.tile.pve.cta": "ИГРАТЬ",
    "home.tile.pvp.title": "PvP АРЕНА",
    "home.tile.pvp.sub": "Ставь · играй · забирай",
    "home.tile.pvp.desc":
      "Ставка от 0.001 до 0.01 ETH. Победитель забирает 95 % банка одной транзакцией.",
    "home.tile.pvp.cta": "СОЗДАТЬ / ВОЙТИ",
    "home.tile.leaderboard.title": "ЛИДЕРБОРД",
    "home.tile.leaderboard.sub": "Мировой рейтинг",
    "home.tile.leaderboard.desc":
      "Топ капитанов по XP. Твоё место обновляется после каждого матча.",
    "home.tile.leaderboard.cta": "СМОТРЕТЬ",
    "home.tile.profile.title": "ПРОФИЛЬ",
    "home.tile.profile.sub": "Статы · Магазин · Достижения",
    "home.tile.profile.desc":
      "Ранг, баланс, достижения и магазин плюшек — всё в одном месте.",
    "home.tile.profile.cta": "ОТКРЫТЬ",

    "settings.title": "Настройки",
    "settings.close": "Закрыть настройки",
    "settings.sfx": "Звуковые эффекты",
    "settings.sfx.sub": "Выстрелы, взрывы, оповещения",
    "settings.music": "Фоновая музыка",
    "settings.music.sub": "Эмбиент-луп",
    "settings.volume": "Общая громкость",
    "settings.lang": "Язык",
    "settings.note":
      "Звук синтезируется через Web Audio — ничего не скачивается. Если не слышно после включения — кликни один раз по странице.",

    "fleet.afloat": "На плаву",
    "fleet.your": "Твой флот",
    "fleet.enemy": "Флот противника",
    "fleet.damaged": "Подбит",
    "fleet.sunk": "Потоплен",
    "ship.carrier": "Авианосец",
    "ship.battleship": "Линкор",
    "ship.cruiser": "Крейсер",
    "ship.submarine": "Подлодка",
    "ship.destroyer": "Эсминец",

    "pve.title": "Игра с ботом",
    "pve.subtitle": "Abstract Sepolia · тестнет ETH",
    "pve.playing": "Играешь против",
    "pve.bot": "бот · {{level}}",
    "pve.yourTurn": "Твой ход",
    "pve.botThinking": "Бот думает…",
    "pve.intro": "Попал — стреляй ещё. Промах — ход бота. Не прозевай время.",
    "pve.log": "Лог боя",
    "pve.yourShot": "Твой выстрел",

    "pu.title": "Плюшки",
    "pu.none": "Плюшек нет. Забери ежедневный ящик или зайди в магазин.",
    "pu.aim.bomb": "Режим бомбы · кликни клетку, удар по 3×3",
    "pu.aim.radar": "Режим радара · кликни клетку, скан 3×3",
    "pu.cancel": "Отмена",
    "pu.radarResult": "Радар: {{n}} клеток корабля в 3×3",
    "pu.radarClear": "Радар: чисто",
    "pu.locked.pvp": "Только PvP",
    "pu.locked.soon": "Скоро",

    "splash.tagline": "Ставка · Игра · Клейм",
    "splash.enter": "В бой",

    "shop.title": "Магазин",
    "shop.subtitle": "Трать монеты на боевые плюшки",
    "shop.balance": "Монеты",
    "shop.buy": "Купить",
    "shop.owned": "В инвентаре",
    "shop.need": "Нужно ещё {{n}}",
    "shop.full": "Инвентарь полон · лимит {{n}}",

    "coins.label": "Монеты",
    "coins.earned": "+{{n}} монет",
    "coins.migration.grant":
      "Приветственный бонус: +{{n}} монет. Монеты — новая игровая валюта, отдельная от XP. Трать в магазине.",

    "pvp.mode.title": "Формат матча",
    "pvp.mode.classic.name": "Классик",
    "pvp.mode.classic.badge": "Чистый скил",
    "pvp.mode.classic.desc":
      "Без плюшек. Победа решается расстановкой и прочтением поля. Рекомендуем для честной игры.",
    "pvp.mode.arcade.name": "Аркада",
    "pvp.mode.arcade.badge": "Скоро",
    "pvp.mode.arcade.desc":
      "Оба игрока получают одинаковый стартовый набор (1 бомба + 1 радар), инвентарь не тратится. Включим в следующем патче.",

    "rank.decay.inactivity":
      "Заметка: если не играть более {{days}} дней, XP начнёт капать по {{per}} в неделю.",
    "rank.decay.losing.streak":
      "Серия поражений: {{n}}. Следующий проигрыш снимет {{penalty}} XP.",
    "rank.decay.applied":
      "Начислен декей за неактивность: −{{n}} XP. Сыграй матч, чтобы обнулить таймер.",
    "shop.daily.title": "Ежедневный ящик",
    "shop.daily.desc": "Бесплатно Bomb + Radar раз в сутки. Просто зайди в магазин.",
    "shop.daily.claim": "Забрать сегодняшний ящик",
    "shop.daily.claimed": "Забран · возвращайся через {{h}}ч {{m}}м",
    "shop.bomb.name": "Бомба",
    "shop.bomb.desc": "Удар по площади 3×3 вокруг цели.",
    "shop.radar.name": "Радар",
    "shop.radar.desc": "Сканирует 3×3 и показывает, сколько клеток корабля внутри.",
    "shop.torpedo.name": "Торпеда",
    "shop.torpedo.desc": "Стреляет вдоль всего ряда/столбца до первого корабля.",
    "shop.shield.name": "Щит",
    "shop.shield.desc": "Блокирует следующее попадание по тебе (только PvP).",

    "ach.section.title": "Достижения",
    "ach.section.subtitle": "{{n}}/{{total}} получено · заработано {{coins}} монет",
    "ach.locked": "Не получено",
    "ach.unlocked": "Получено",
    "ach.reward": "+{{n}} 🪙",
    "ach.toast.title": "Достижение получено",
    "ach.toast.body": "{{title}} · +{{reward}} монет",
    "ach.title.kraken": "Кракен",
    "ach.title.ghost": "Призрак",
    "ach.title.admiral": "Адмирал флота",
    "ach.firstBlood.title": "Первая кровь",
    "ach.firstBlood.desc": "Потопи первый корабль.",
    "ach.firstWin.title": "Первый залп",
    "ach.firstWin.desc": "Выиграй первый матч.",
    "ach.hundredMatches.title": "Командор",
    "ach.hundredMatches.desc": "Сыграй 100 матчей.",
    "ach.fiveHundredMatches.title": "Ветеран",
    "ach.fiveHundredMatches.desc": "Сыграй 500 матчей.",
    "ach.tenWinStreak.title": "Непобедимый",
    "ach.tenWinStreak.desc": "Выиграй 10 матчей подряд.",
    "ach.ironFist.title": "Железный кулак",
    "ach.ironFist.desc": "Победа на Hard без единого буста.",
    "ach.quickDraw.title": "Скорострел",
    "ach.quickDraw.desc": "Заверши матч быстрее 60 секунд.",
    "ach.silentHunter.title": "Тихий охотник",
    "ach.silentHunter.desc": "Победа за 25 выстрелов или меньше.",
    "ach.blindSeer.title": "Слепой прорицатель",
    "ach.blindSeer.desc": "Победа без радара и бомбы.",
    "ach.rankMatros.title": "Поднять флаг",
    "ach.rankMatros.desc": "Достичь ранга Матрос.",
    "ach.rankMichman.title": "Офицерский путь",
    "ach.rankMichman.desc": "Достичь ранга Мичман.",
    "ach.rankLieutenant.title": "Командный мостик",
    "ach.rankLieutenant.desc": "Достичь ранга Лейтенант.",
    "ach.rankAdmiral.title": "Адмирал флота",
    "ach.rankAdmiral.desc": "Достичь ранга Адмирал.",
    "ach.torpedoMaster.title": "Торпедист",
    "ach.torpedoMaster.desc": "Выпусти 10 торпед.",
    "ach.bombMaster.title": "Минёр",
    "ach.bombMaster.desc": "Сбрось 10 бомб.",
    "ach.shieldBearer.title": "Щитоносец",
    "ach.shieldBearer.desc": "Используй 5 щитов.",
    "ach.collector.title": "Коллекционер",
    "ach.collector.desc": "Купи хотя бы по одному из каждого буста.",
    "ach.richCaptain.title": "Богатый капитан",
    "ach.richCaptain.desc": "Накопи 1 000 монет на балансе.",
    "ach.dailyRoutine.title": "Режим",
    "ach.dailyRoutine.desc": "Забери 7 ежедневных крейтов.",
    "ach.firstTryHard.title": "Удача новичка",
    "ach.firstTryHard.desc": "Победа на Hard с первой попытки.",

    "legal.gate.title": "Короткая проверка",
    "legal.gate.subtitle": "Прежде чем войти в игру",
    "legal.gate.intro":
      "SeaBattle — игра на умение. Играть можно бесплатно (PvE Easy) или ставить тестовый/реальный ETH против другого игрока. Подтверди два пункта, прежде чем продолжить.",
    "legal.gate.age.check": "Мне исполнилось 18 лет (или возраст совершеннолетия в моей стране).",
    "legal.gate.tos.before": "Я прочитал(а) и согласен(на) с",
    "legal.gate.tos.link": "Условиями использования",
    "legal.gate.and": "и",
    "legal.gate.privacy.link": "Политикой конфиденциальности",
    "legal.gate.disclaimer":
      "SeaBattle недоступен в штатах США WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE, а также в ОАЭ / Сингапуре / Китае / Саудовской Аравии / санкционных странах. Играй ответственно.",
    "legal.gate.accept": "Войти в SeaBattle",
    "legal.gate.help": "Помощь по зависимости",

    "legal.geo.sanctioned.title": "SeaBattle недоступен в вашем регионе",
    "legal.geo.country.title": "SeaBattle недоступен в вашей стране",
    "legal.geo.state.title": "SeaBattle недоступен в вашем штате",
    "legal.geo.body":
      "По IP-адресу вы находитесь в юрисдикции, где мы не предлагаем платные игры на умение. Это не про вас лично — это защита сервиса от локальных регуляторных рисков.",
    "legal.geo.detected": "Обнаружено",
    "legal.geo.disclaimer":
      "Если это ошибка (например, вы подключены через VPN с выходом в одной из этих стран) — отключите VPN и перезагрузите страницу.",

    "footer.terms": "Условия",
    "footer.privacy": "Приватность",
    "footer.responsible": "Ответственная игра · 1-800-GAMBLER",
    "footer.tagline": "Игра на умение · Некастодиальная · 18+",

    "common.back": "Назад",
    "common.home": "На главную",
    "common.cancel": "Отмена",
    "common.confirm": "Подтвердить",
    "common.error": "Что-то пошло не так",
  },

  uk: {
    "brand.name": "SeaBattle",
    "brand.tagline": "Ставка · Гра · Клейм",
    "brand.era": "Закрита бета · Abstract Testnet",

    "beta.badge": "Закрита бета · Testnet",
    "beta.copy": "Abstract Sepolia testnet — реальних грошей немає, баланси можуть скинутись.",
    "beta.banner.aria": "Сповіщення про закриту бету",
    "beta.dismiss.aria": "Сховати",

    "network.wrong": "Неправильна мережа — перейдіть на {{chain}}, щоб грати.",
    "network.switch": "Перемкнути мережу",
    "network.switching": "Перемикаємо…",

    "nav.feedback": "Повідомити про баг",
    "feedback.title": "Повідомити про баг",
    "feedback.subtitle": "Розкажіть, що сталося. Якщо залишите email — відповімо.",
    "feedback.message.label": "Що пішло не так?",
    "feedback.message.placeholder": "Опишіть кроки та що ви очікували побачити…",
    "feedback.email.label": "Email",
    "feedback.email.optional": "(необов'язково)",
    "feedback.attached.wallet": "Додано: гаманець {{address}}",
    "feedback.success": "Дякуємо — отримали.",
    "feedback.error": "Не вдалося надіслати. Спробуйте пізніше.",
    "feedback.cancel": "Скасувати",
    "feedback.submit": "Надіслати",
    "feedback.sending": "Надсилаємо…",
    "feedback.close": "Закрити",

    "nav.home": "Головна",
    "nav.pve": "Грати з ботом",
    "nav.pvp": "PvP арена",
    "nav.profile": "Профіль",
    "nav.leaderboard": "Лідерборд",
    "nav.shop": "Магазин",
    "nav.settings": "Налаштування",
    "nav.connect": "Підключити",
    "nav.disconnect": "Відключити",
    "auth.signIn": "Увійти",
    "auth.signingIn": "Підпис…",

    "home.title1": "SEA",
    "home.title2": "BATTLE",
    "home.pitch":
      "Ставиш, граєш, забираєш. Переможець отримує {{pct}} банку on-chain. PvE режим майже безкоштовний — лише газ, лупи ботів, рости від Юнги до Адмірала.",
    "home.cta.enter": "У БІЙ",
    "home.yourRank": "Твій ранг",
    "home.xpTo": "{{n}} XP до {{rank}}",
    "home.tile.pve.title": "ГРА З БОТОМ",
    "home.tile.pve.sub": "Безкоштовний XP",
    "home.tile.pve.desc":
      "Easy безкоштовно. Normal/Hard — копійки тестнет-ETH. Топи бота, збирай XP, росни у званні.",
    "home.tile.pve.cta": "ГРАТИ",
    "home.tile.pvp.title": "PvP АРЕНА",
    "home.tile.pvp.sub": "Став · грай · забирай",
    "home.tile.pvp.desc":
      "Ставка від 0.001 до 0.01 ETH. Переможець забирає 95 % банку однією транзакцією.",
    "home.tile.pvp.cta": "СТВОРИТИ / ЗАЙТИ",
    "home.tile.leaderboard.title": "ЛІДЕРБОРД",
    "home.tile.leaderboard.sub": "Світовий рейтинг",
    "home.tile.leaderboard.desc":
      "Топ капітанів за XP. Твоє місце оновлюється після кожного матчу.",
    "home.tile.leaderboard.cta": "ПЕРЕГЛЯНУТИ",
    "home.tile.profile.title": "ПРОФІЛЬ",
    "home.tile.profile.sub": "Стати · Магазин · Досягнення",
    "home.tile.profile.desc":
      "Ранг, баланс, досягнення та магазин плюшок — все в одному місці.",
    "home.tile.profile.cta": "ВІДКРИТИ",

    "settings.title": "Налаштування",
    "settings.close": "Закрити налаштування",
    "settings.sfx": "Звукові ефекти",
    "settings.sfx.sub": "Постріли, вибухи, сповіщення",
    "settings.music": "Фонова музика",
    "settings.music.sub": "Ембієнт-луп",
    "settings.volume": "Загальна гучність",
    "settings.lang": "Мова",
    "settings.note":
      "Звук синтезується через Web Audio — нічого не завантажується. Якщо не чути після вмикання — клікни один раз по сторінці.",

    "fleet.afloat": "На плаву",
    "fleet.your": "Твій флот",
    "fleet.enemy": "Флот ворога",
    "fleet.damaged": "Пошкоджений",
    "fleet.sunk": "Потоплений",
    "ship.carrier": "Авіаносець",
    "ship.battleship": "Лінкор",
    "ship.cruiser": "Крейсер",
    "ship.submarine": "Субмарина",
    "ship.destroyer": "Есмінець",

    "pve.title": "Гра з ботом",
    "pve.subtitle": "Abstract Sepolia · тестнет ETH",
    "pve.playing": "Граєш проти",
    "pve.bot": "бот · {{level}}",
    "pve.yourTurn": "Твій хід",
    "pve.botThinking": "Бот думає…",
    "pve.intro": "Влучив — стріляй ще. Промах — хід бота. Не проґав час.",
    "pve.log": "Лог бою",
    "pve.yourShot": "Твій постріл",

    "pu.title": "Плюшки",
    "pu.none": "Плюшок немає. Візьми щоденну скриню або зайди в магазин.",
    "pu.aim.bomb": "Режим бомби · клікни клітину, удар по 3×3",
    "pu.aim.radar": "Режим радара · клікни клітину, скан 3×3",
    "pu.cancel": "Скасувати",
    "pu.radarResult": "Радар: {{n}} клітин корабля в 3×3",
    "pu.radarClear": "Радар: чисто",
    "pu.locked.pvp": "Тільки PvP",
    "pu.locked.soon": "Скоро",

    "splash.tagline": "Ставка · Гра · Клейм",
    "splash.enter": "У бій",

    "shop.title": "Магазин",
    "shop.subtitle": "Витрачай монети на бойові плюшки",
    "shop.balance": "Монети",
    "shop.buy": "Купити",
    "shop.owned": "В інвентарі",
    "shop.need": "Потрібно ще {{n}}",
    "shop.full": "Інвентар повний · ліміт {{n}}",

    "coins.label": "Монети",
    "coins.earned": "+{{n}} монет",
    "coins.migration.grant":
      "Вітальний бонус: +{{n}} монет. Монети — нова ігрова валюта, окрема від XP. Витрачай в магазині.",

    "pvp.mode.title": "Формат матчу",
    "pvp.mode.classic.name": "Класик",
    "pvp.mode.classic.badge": "Чистий скіл",
    "pvp.mode.classic.desc":
      "Без плюшок. Перемога вирішується розташуванням і читанням поля. Рекомендуємо для чесної гри.",
    "pvp.mode.arcade.name": "Аркада",
    "pvp.mode.arcade.badge": "Скоро",
    "pvp.mode.arcade.desc":
      "Обидва гравці отримують однаковий стартовий набір (1 бомба + 1 радар), інвентар не витрачається. Запустимо в наступному оновленні.",

    "rank.decay.inactivity":
      "Увага: якщо не грати понад {{days}} днів, XP почне крапати по {{per}} на тиждень.",
    "rank.decay.losing.streak":
      "Серія поразок: {{n}}. Наступна поразка зніме {{penalty}} XP.",
    "rank.decay.applied":
      "Нараховано декей за неактивність: −{{n}} XP. Зіграй матч, щоб скинути таймер.",
    "shop.daily.title": "Щоденна скриня",
    "shop.daily.desc": "Безкоштовно Bomb + Radar раз на добу. Просто зайди в магазин.",
    "shop.daily.claim": "Забрати сьогоднішню скриню",
    "shop.daily.claimed": "Забрано · повертайся через {{h}}г {{m}}хв",
    "shop.bomb.name": "Бомба",
    "shop.bomb.desc": "Удар по площі 3×3 навколо цілі.",
    "shop.radar.name": "Радар",
    "shop.radar.desc": "Сканує 3×3 і показує, скільки клітин корабля всередині.",
    "shop.torpedo.name": "Торпеда",
    "shop.torpedo.desc": "Стріляє вздовж всього ряду/стовпця до першого корабля.",
    "shop.shield.name": "Щит",
    "shop.shield.desc": "Блокує наступне влучання по тобі (тільки PvP).",

    "ach.section.title": "Досягнення",
    "ach.section.subtitle": "{{n}}/{{total}} отримано · заробленo {{coins}} монет",
    "ach.locked": "Не отримано",
    "ach.unlocked": "Отримано",
    "ach.reward": "+{{n}} 🪙",
    "ach.toast.title": "Досягнення отримано",
    "ach.toast.body": "{{title}} · +{{reward}} монет",
    "ach.title.kraken": "Кракен",
    "ach.title.ghost": "Привид",
    "ach.title.admiral": "Адмірал флоту",
    "ach.firstBlood.title": "Перша кров",
    "ach.firstBlood.desc": "Потопи перший корабель.",
    "ach.firstWin.title": "Перший залп",
    "ach.firstWin.desc": "Виграй перший матч.",
    "ach.hundredMatches.title": "Командор",
    "ach.hundredMatches.desc": "Зіграй 100 матчів.",
    "ach.fiveHundredMatches.title": "Ветеран",
    "ach.fiveHundredMatches.desc": "Зіграй 500 матчів.",
    "ach.tenWinStreak.title": "Нездоланний",
    "ach.tenWinStreak.desc": "Виграй 10 матчів поспіль.",
    "ach.ironFist.title": "Залізний кулак",
    "ach.ironFist.desc": "Перемога на Hard без жодного буста.",
    "ach.quickDraw.title": "Скорострільний",
    "ach.quickDraw.desc": "Заверши матч швидше 60 секунд.",
    "ach.silentHunter.title": "Тихий мисливець",
    "ach.silentHunter.desc": "Перемога за 25 пострілів або менше.",
    "ach.blindSeer.title": "Сліпий пророк",
    "ach.blindSeer.desc": "Перемога без радара й бомби.",
    "ach.rankMatros.title": "Підняти прапор",
    "ach.rankMatros.desc": "Досягти рангу Матрос.",
    "ach.rankMichman.title": "Офіцерський шлях",
    "ach.rankMichman.desc": "Досягти рангу Мічман.",
    "ach.rankLieutenant.title": "Командний місток",
    "ach.rankLieutenant.desc": "Досягти рангу Лейтенант.",
    "ach.rankAdmiral.title": "Адмірал флоту",
    "ach.rankAdmiral.desc": "Досягти рангу Адмірал.",
    "ach.torpedoMaster.title": "Торпедист",
    "ach.torpedoMaster.desc": "Випусти 10 торпед.",
    "ach.bombMaster.title": "Мінер",
    "ach.bombMaster.desc": "Скинь 10 бомб.",
    "ach.shieldBearer.title": "Щитоносець",
    "ach.shieldBearer.desc": "Використай 5 щитів.",
    "ach.collector.title": "Колекціонер",
    "ach.collector.desc": "Купи хоча б по одному з кожного буста.",
    "ach.richCaptain.title": "Багатий капітан",
    "ach.richCaptain.desc": "Накопич 1 000 монет на балансі.",
    "ach.dailyRoutine.title": "Режим",
    "ach.dailyRoutine.desc": "Забери 7 щоденних крейтів.",
    "ach.firstTryHard.title": "Щастя новачка",
    "ach.firstTryHard.desc": "Перемога на Hard з першої спроби.",

    "legal.gate.title": "Коротка перевірка",
    "legal.gate.subtitle": "Перш ніж увійти у гру",
    "legal.gate.intro":
      "SeaBattle — гра на вміння. Грати можна безкоштовно (PvE Easy) або ставити тестовий/реальний ETH проти іншого гравця. Підтверди два пункти, перш ніж продовжити.",
    "legal.gate.age.check": "Мені виповнилось 18 років (або вік повноліття у моїй країні).",
    "legal.gate.tos.before": "Я прочитав(ла) і погоджуюсь з",
    "legal.gate.tos.link": "Умовами використання",
    "legal.gate.and": "та",
    "legal.gate.privacy.link": "Політикою конфіденційності",
    "legal.gate.disclaimer":
      "SeaBattle недоступний у штатах США WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE, а також в ОАЕ / Сінгапурі / Китаї / Саудівській Аравії / санкційних країнах. Грай відповідально.",
    "legal.gate.accept": "Увійти в SeaBattle",
    "legal.gate.help": "Допомога при залежності",

    "legal.geo.sanctioned.title": "SeaBattle недоступний у вашому регіоні",
    "legal.geo.country.title": "SeaBattle недоступний у вашій країні",
    "legal.geo.state.title": "SeaBattle недоступний у вашому штаті",
    "legal.geo.body":
      "За IP-адресою ви в юрисдикції, де ми не пропонуємо платні ігри на вміння. Це не про вас особисто — це захист сервісу від локальних регуляторних ризиків.",
    "legal.geo.detected": "Визначено",
    "legal.geo.disclaimer":
      "Якщо це помилка (наприклад, ви підключені через VPN з виходом в одній з цих країн) — вимкніть VPN і перезавантажте сторінку.",

    "footer.terms": "Умови",
    "footer.privacy": "Приватність",
    "footer.responsible": "Відповідальна гра · 1-800-GAMBLER",
    "footer.tagline": "Гра на вміння · Некастодіальна · 18+",

    "common.back": "Назад",
    "common.home": "На головну",
    "common.cancel": "Скасувати",
    "common.confirm": "Підтвердити",
    "common.error": "Щось пішло не так",
  },
};

type Listener = (lang: Lang) => void;
const listeners = new Set<Listener>();
let currentLang: Lang = detect();

function detect(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LS_KEY);
    if (saved === "en" || saved === "ru" || saved === "uk") return saved;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("uk") || nav.startsWith("ua")) return "uk";
  return "en";
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    window.localStorage.setItem(LS_KEY, lang);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(lang));
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function formatTemplate(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    vars[k] === undefined ? `{{${k}}}` : String(vars[k]),
  );
}

/**
 * React hook returning a translator bound to the current language. Also
 * re-renders on language change via `useSyncExternalStore`.
 */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const lang = useSyncExternalStore<Lang>(
    (onChange) => subscribe(() => onChange()),
    () => currentLang,
    () => "en" as Lang,
  );
  return (key, vars) => {
    const dict = dictionaries[lang] ?? dictionaries.en;
    const val = dict[key] ?? dictionaries.en[key] ?? key;
    return formatTemplate(val, vars);
  };
}

/** Non-hook lookup for places where a hook can't run (e.g. stats descriptions). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[currentLang] ?? dictionaries.en;
  const val = dict[key] ?? dictionaries.en[key] ?? key;
  return formatTemplate(val, vars);
}

export function useLang(): Lang {
  return useSyncExternalStore<Lang>(
    (onChange) => subscribe(() => onChange()),
    () => currentLang,
    () => "en" as Lang,
  );
}
