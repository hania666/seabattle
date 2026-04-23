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
    "brand.era": "Pre-alpha · Abstract Testnet",

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
    "home.tile.shop.title": "SHIP SHOP",
    "home.tile.shop.sub": "Powerups for Coins",
    "home.tile.shop.desc":
      "Spend Coins on bombs, radars, torpedoes, shields. Daily free crate on login.",
    "home.tile.shop.cta": "BROWSE",

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
    "brand.era": "Пре-альфа · Abstract Testnet",

    "nav.home": "Главная",
    "nav.pve": "Играть с ботом",
    "nav.pvp": "PvP арена",
    "nav.profile": "Профиль",
    "nav.leaderboard": "Лидерборд",
    "nav.shop": "Магазин",
    "nav.settings": "Настройки",
    "nav.connect": "Подключить",
    "nav.disconnect": "Отключить",

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
    "home.tile.shop.title": "МАГАЗИН",
    "home.tile.shop.sub": "Плюшки за монеты",
    "home.tile.shop.desc":
      "Бомбы, радары, торпеды, щиты — за монеты. Ежедневный бесплатный ящик.",
    "home.tile.shop.cta": "ОТКРЫТЬ",

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

    "common.back": "Назад",
    "common.home": "На главную",
    "common.cancel": "Отмена",
    "common.confirm": "Подтвердить",
    "common.error": "Что-то пошло не так",
  },

  uk: {
    "brand.name": "SeaBattle",
    "brand.tagline": "Ставка · Гра · Клейм",
    "brand.era": "Пре-альфа · Abstract Testnet",

    "nav.home": "Головна",
    "nav.pve": "Грати з ботом",
    "nav.pvp": "PvP арена",
    "nav.profile": "Профіль",
    "nav.leaderboard": "Лідерборд",
    "nav.shop": "Магазин",
    "nav.settings": "Налаштування",
    "nav.connect": "Підключити",
    "nav.disconnect": "Відключити",

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
    "home.tile.shop.title": "МАГАЗИН",
    "home.tile.shop.sub": "Плюшки за монети",
    "home.tile.shop.desc":
      "Бомби, радари, торпеди, щити — за монети. Щоденна безкоштовна скриня.",
    "home.tile.shop.cta": "ВІДКРИТИ",

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
