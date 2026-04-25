/**
 * Terms of Service and Privacy Policy content, per language.
 *
 * These are plain structured documents (sections with prose). They live here
 * rather than in the i18n dictionary because they are long-form and would
 * drown out the UI strings. Update CURRENT_CONSENT_VERSION in lib/legal.ts
 * when you change anything material here.
 */

import type { Lang } from "../../lib/i18n";

export type LegalSection = {
  title: string;
  body: string[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const EFFECTIVE_DATE = "2025-04-22";

export const TERMS: Record<Lang, LegalDocument> = {
  en: {
    title: "Terms of Service",
    effectiveDate: `Effective: ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. What SeaBattle is",
        body: [
          'SeaBattle ("we", "the service", "the game") is a peer-to-peer, skill-based naval strategy game that runs as a web front-end on top of non-custodial smart contracts deployed to the Abstract chain. Ship placement and shot selection are chosen by the player; there is no random number generator, no dealer, and no house-controlled outcome.',
          "Matches are settled on-chain. Stakes are escrowed by the BattleshipLobby smart contract for player-vs-player games and by the BotMatch smart contract for player-vs-bot games. We do not take custody of your funds at any point. The winner claims the pot directly from the contract with their own wallet.",
        ],
      },
      {
        title: "2. Skill-based game, not a lottery",
        body: [
          "SeaBattle is a contest of skill. The outcome depends materially on the player's decisions — ship placement, search pattern, information management — and not on chance. We do not operate a lottery, a sportsbook, a casino, or any game where the outcome is determined by a random event.",
          "You should still verify that skill-based wagering is legal in your jurisdiction before depositing any funds. The list of jurisdictions we decline to serve is in Section 4 below.",
        ],
      },
      {
        title: "3. Age requirement",
        body: [
          "You must be at least 18 years old (or the age of majority in your jurisdiction, whichever is greater) to use the service. By using SeaBattle you represent that you meet this requirement.",
          "If we become aware that a user is under 18, we will terminate their access. Funds already settled on-chain are not recoverable by us.",
        ],
      },
      {
        title: "4. Restricted jurisdictions",
        body: [
          "The service is not offered to, and may not be used by, residents of the following places: Cuba, Iran, North Korea, Syria, the United Arab Emirates, Singapore, mainland China, and Saudi Arabia. Within the United States, residents of Washington, Arizona, Louisiana, Montana, South Dakota, South Carolina, Tennessee, Arkansas, Connecticut, and Delaware may not participate in any paid match.",
          "We implement a best-effort client-side geo-block based on IP address. Circumventing this block (e.g. via VPN) is a breach of these Terms and does not create any right against the service operator.",
        ],
      },
      {
        title: "5. Fees",
        body: [
          "Player-vs-player matches: the winner claims 95% of the total pot; 5% is retained by the protocol as a platform fee. The fee parameter is set on-chain in BattleshipLobby and is publicly verifiable.",
          "Player-vs-bot matches: the entire entry fee is a platform fee. There is a free mode (Easy) and two paid modes (Normal, Hard) whose stakes are measured in fractions of a cent.",
          "Network gas fees are separate and paid directly by you to the Abstract network. We do not receive any portion of gas.",
        ],
      },
      {
        title: "6. Non-custodial escrow",
        body: [
          "At no point does the service take custody of your assets. Funds flow directly from your wallet to the smart contract and, on settlement, directly from the contract to the wallet of the winner (or back to the loser's wallet on timeout or refund).",
          "Smart contracts are immutable code. Once deployed, we cannot change a match result, reverse a transaction, or withdraw funds held in escrow on your behalf. If a bug causes funds to become permanently locked, we will document the incident publicly but cannot guarantee reimbursement.",
        ],
      },
      {
        title: "7. Responsible play",
        body: [
          "Only wager what you can afford to lose. SeaBattle is a game; it is not an investment product. If you feel your participation is becoming compulsive, stop. In the United States, the National Council on Problem Gambling operates a 24/7 helpline at 1-800-GAMBLER. Internationally: https://www.begambleaware.org.",
        ],
      },
      {
        title: "8. No warranty",
        body: [
          'The service is provided "as is" and "as available", without any warranty of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.',
          "We do not warrant that the service will be uninterrupted, error-free, secure, or free of bugs. Smart-contract code has been tested but not independently audited at launch.",
        ],
      },
      {
        title: "9. Limitation of liability",
        body: [
          "To the maximum extent permitted by law, the operators, contributors, and affiliates of SeaBattle shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, data, goodwill, or other intangible losses, arising out of or relating to your use of, or inability to use, the service.",
          "Our aggregate liability to you for any claim arising out of or relating to these Terms or the service shall not exceed the total fees (excluding gas) you have paid to the protocol in the ninety days immediately preceding the event giving rise to the claim.",
        ],
      },
      {
        title: "10. Indemnification",
        body: [
          "You agree to indemnify and hold harmless the operators, contributors, and affiliates of SeaBattle from any claim, liability, loss, damage, or expense (including reasonable legal fees) arising out of your breach of these Terms, your violation of any law, or your infringement of any third-party right.",
        ],
      },
      {
        title: "11. Changes to these Terms",
        body: [
          "We may update these Terms from time to time. Material changes bump the consent version, and you will be asked to re-accept on your next visit. Continued use after a non-material change constitutes acceptance.",
        ],
      },
      {
        title: "12. Governing law and disputes",
        body: [
          "These Terms are governed by the laws of a neutral commercial forum to be designated by the operator at the time a dispute arises. Any dispute shall be resolved by binding arbitration on an individual basis; class actions and jury trials are waived to the extent permitted by law.",
        ],
      },
      {
        title: "13. Contact",
        body: [
          "Issues, security disclosures, takedown requests, and general correspondence: open an issue at https://github.com/hania666/seabattle.",
        ],
      },
    ],
  },
  ru: {
    title: "Условия использования",
    effectiveDate: `Действует с ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. Что такое SeaBattle",
        body: [
          'SeaBattle («мы», «сервис», «игра») — это игра в морской бой между игроками, основанная на навыке. Клиент — веб-приложение, поверх набора некастодиальных смарт-контрактов в сети Abstract. Размещение кораблей и выбор выстрелов делает игрок; в игре нет генератора случайных чисел, нет дилера и нет никакого скрытого результата.',
          "Матчи рассчитываются on-chain. Ставки хранятся в смарт-контракте BattleshipLobby для матчей игрок-против-игрока и в BotMatch для матчей против бота. Мы не получаем ваши средства во владение ни на одной стадии. Победитель забирает банк напрямую из контракта своим кошельком.",
        ],
      },
      {
        title: "2. Игра на навык, не лотерея",
        body: [
          "SeaBattle — соревнование на умение. Результат существенно определяется решениями игрока — расстановкой кораблей, стратегией поиска, работой с информацией, — а не случайностью. Мы не ведём лотерей, букмекерских ставок, казино и никаких игр, в которых исход определяется случайным событием.",
          "Тем не менее вы обязаны самостоятельно убедиться, что участие в играх на умение с денежной ставкой законно в вашей юрисдикции, прежде чем вносить средства. Список юрисдикций, где сервис не предоставляется, приведён в пункте 4.",
        ],
      },
      {
        title: "3. Возрастное ограничение",
        body: [
          "Вам должно быть не менее 18 лет (или возраст совершеннолетия в вашей юрисдикции, если он выше), чтобы пользоваться сервисом. Используя SeaBattle, вы подтверждаете соответствие этому требованию.",
          "Если нам станет известно, что пользователь не достиг 18 лет, его доступ будет прекращён. Средства, уже расчётанные on-chain, мы вернуть не можем.",
        ],
      },
      {
        title: "4. Запрещённые юрисдикции",
        body: [
          "Сервис не предоставляется и не может использоваться резидентами следующих территорий: Куба, Иран, Северная Корея, Сирия, ОАЭ, Сингапур, материковый Китай и Саудовская Аравия. На территории США резиденты штатов Вашингтон, Аризона, Луизиана, Монтана, Южная Дакота, Южная Каролина, Теннесси, Арканзас, Коннектикут и Делавэр не могут участвовать в платных матчах.",
          "Мы применяем клиентский гео-блок на основе IP-адреса. Обход этого блока (например, через VPN) нарушает настоящие Условия и не создаёт прав требований к оператору сервиса.",
        ],
      },
      {
        title: "5. Комиссии",
        body: [
          "Матчи игрок-против-игрока: победитель забирает 95% общего банка, 5% удерживает протокол в качестве комиссии. Параметр комиссии зафиксирован on-chain в контракте BattleshipLobby и публично проверяем.",
          "Матчи против бота: вся ставка является комиссией протокола. Есть бесплатный режим (Easy) и два платных (Normal, Hard), ставки в которых — доли цента.",
          "Газ сети оплачивается отдельно напрямую в сеть Abstract. Ни доли газа мы не получаем.",
        ],
      },
      {
        title: "6. Некастодиальный эскроу",
        body: [
          "В любой момент времени сервис не владеет вашими активами. Средства напрямую переходят от вашего кошелька в смарт-контракт, а после расчёта — напрямую в кошелёк победителя (или возвращаются проигравшему при таймауте или рефанде).",
          "Смарт-контракты — неизменяемый код. После деплоя мы не можем изменить результат матча, отменить транзакцию или вывести средства из эскроу от вашего имени. Если баг приведёт к необратимой блокировке средств — мы публично задокументируем инцидент, но не гарантируем возмещение.",
        ],
      },
      {
        title: "7. Ответственная игра",
        body: [
          "Ставьте только то, что готовы потерять. SeaBattle — это игра, не инвестиционный продукт. Если вы чувствуете, что участие становится компульсивным — остановитесь. В США круглосуточный телефон доверия Национального совета по проблемам азартных игр: 1-800-GAMBLER. Международно: https://www.begambleaware.org.",
        ],
      },
      {
        title: "8. Отсутствие гарантий",
        body: [
          'Сервис предоставляется "как есть" и "по доступности", без каких-либо гарантий, прямых или подразумеваемых, включая гарантии коммерческой пригодности, пригодности для конкретной цели или отсутствия нарушений прав.',
          "Мы не гарантируем непрерывность работы, отсутствие ошибок, безопасность или отсутствие багов. Смарт-контракты протестированы юнит-тестами, но на момент запуска не проходили независимый аудит.",
        ],
      },
      {
        title: "9. Ограничение ответственности",
        body: [
          "В максимальной степени, разрешённой применимым правом, операторы, контрибьюторы и аффилированные лица SeaBattle не несут ответственности за любые косвенные, случайные, особые, косвенные или штрафные убытки, а также за любую потерю прибыли, доходов, данных, деловой репутации или иные нематериальные потери, связанные с использованием или невозможностью использования сервиса.",
          "Наша совокупная ответственность перед вами по любым требованиям, вытекающим из этих Условий или сервиса, не превышает общей суммы комиссий (без учёта газа), которую вы уплатили протоколу за 90 дней, непосредственно предшествующих событию, вызвавшему требование.",
        ],
      },
      {
        title: "10. Компенсация",
        body: [
          "Вы соглашаетесь оградить операторов, контрибьюторов и аффилированных лиц SeaBattle от любых требований, обязательств, потерь, ущерба или расходов (включая разумные юридические издержки), возникающих из нарушения вами настоящих Условий, нарушения вами закона или нарушения прав третьих лиц.",
        ],
      },
      {
        title: "11. Изменения Условий",
        body: [
          "Мы можем обновлять настоящие Условия время от времени. Материальные изменения сдвигают версию согласия, и вам будет предложено повторно принять Условия при следующем заходе. Продолжение использования после нематериального изменения считается согласием.",
        ],
      },
      {
        title: "12. Применимое право и споры",
        body: [
          "Настоящие Условия регулируются законами нейтральной коммерческой юрисдикции, определяемой оператором на момент возникновения спора. Любой спор разрешается в обязательном арбитраже в индивидуальном порядке; коллективные иски и суд присяжных отклоняются в максимально допустимой законом степени.",
        ],
      },
      {
        title: "13. Контакты",
        body: [
          "Инциденты, раскрытие уязвимостей, запросы на удаление и общая корреспонденция: откройте issue на https://github.com/hania666/seabattle.",
        ],
      },
    ],
  },
  uk: {
    title: "Умови використання",
    effectiveDate: `Діє з ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. Що таке SeaBattle",
        body: [
          'SeaBattle («ми», «сервіс», «гра») — це гра в морський бій між гравцями, що базується на навичці. Клієнт — веб-застосунок поверх некастодіальних смарт-контрактів у мережі Abstract. Розстановку кораблів і вибір пострілів робить гравець; у грі немає генератора випадкових чисел, немає дилера і немає прихованого результату.',
          "Матчі розраховуються on-chain. Ставки зберігаються у смарт-контракті BattleshipLobby для матчів гравець-проти-гравця й у BotMatch для матчів проти бота. Ми не беремо ваші кошти у володіння на жодному етапі. Переможець забирає банк безпосередньо з контракту власним гаманцем.",
        ],
      },
      {
        title: "2. Гра на навичку, не лотерея",
        body: [
          "SeaBattle — змагання на уміння. Результат істотно визначається рішеннями гравця — розстановкою кораблів, стратегією пошуку, роботою з інформацією, — а не випадком. Ми не ведемо лотерей, букмекерських ставок, казино чи будь-яких ігор, результат яких визначає випадкова подія.",
          "Проте ви зобов'язані самостійно переконатися, що участь у іграх на уміння з грошовою ставкою законна у вашій юрисдикції, перш ніж вносити кошти. Список юрисдикцій, де сервіс не надається, наведено в пункті 4.",
        ],
      },
      {
        title: "3. Віковий ценз",
        body: [
          "Вам має бути щонайменше 18 років (або вік повноліття у вашій юрисдикції, якщо він вищий), аби користуватися сервісом. Використовуючи SeaBattle, ви підтверджуєте відповідність цій вимозі.",
          "Якщо нам стане відомо, що користувач не досяг 18 років, його доступ буде припинено. Кошти, вже розраховані on-chain, ми повернути не можемо.",
        ],
      },
      {
        title: "4. Заборонені юрисдикції",
        body: [
          "Сервіс не надається і не може використовуватися резидентами таких територій: Куба, Іран, Північна Корея, Сирія, ОАЕ, Сінгапур, материковий Китай і Саудівська Аравія. На території США резиденти штатів Вашингтон, Аризона, Луїзіана, Монтана, Південна Дакота, Південна Кароліна, Теннессі, Арканзас, Коннектикут і Делавер не можуть брати участь у платних матчах.",
          "Ми застосовуємо клієнтський гео-блок на основі IP-адреси. Обхід цього блоку (наприклад, через VPN) порушує ці Умови і не створює прав вимог до оператора сервісу.",
        ],
      },
      {
        title: "5. Комісії",
        body: [
          "Матчі гравець-проти-гравця: переможець забирає 95% загального банку, 5% утримує протокол як комісію. Параметр комісії зафіксовано on-chain у контракті BattleshipLobby і публічно перевіряється.",
          "Матчі проти бота: вся ставка є комісією протоколу. Є безкоштовний режим (Easy) і два платні (Normal, Hard), ставки в яких — частки цента.",
          "Газ мережі сплачується окремо безпосередньо у мережу Abstract. Жодної частки газу ми не отримуємо.",
        ],
      },
      {
        title: "6. Некастодіальний ескроу",
        body: [
          "У жодний момент сервіс не володіє вашими активами. Кошти напряму переходять з вашого гаманця у смарт-контракт, а після розрахунку — напряму в гаманець переможця (або повертаються тому, хто програв, у разі таймауту чи повернення).",
          "Смарт-контракти — незмінний код. Після деплою ми не можемо змінити результат матчу, скасувати транзакцію або вивести кошти з ескроу від вашого імені. Якщо баг призведе до безповоротного блокування коштів — ми публічно задокументуємо інцидент, але не гарантуємо відшкодування.",
        ],
      },
      {
        title: "7. Відповідальна гра",
        body: [
          "Ставте лише те, що готові втратити. SeaBattle — це гра, не інвестиційний продукт. Якщо відчуваєте, що участь стає компульсивною — зупиніться. У США цілодобовий телефон довіри Національної ради з проблем азартних ігор: 1-800-GAMBLER. Міжнародно: https://www.begambleaware.org.",
        ],
      },
      {
        title: "8. Відсутність гарантій",
        body: [
          'Сервіс надається "як є" і "за доступністю", без будь-яких гарантій, прямих чи непрямих, включно з гарантіями комерційної придатності, придатності для певної мети або відсутності порушень прав.',
          "Ми не гарантуємо безперервність роботи, відсутність помилок, безпеку чи відсутність багів. Смарт-контракти протестовано юніт-тестами, але на момент запуску вони не проходили незалежний аудит.",
        ],
      },
      {
        title: "9. Обмеження відповідальності",
        body: [
          "У максимальному обсязі, дозволеному законом, оператори, контриб'ютори та афілійовані особи SeaBattle не відповідають за будь-які непрямі, випадкові, особливі, побічні чи штрафні збитки, а також за будь-яку втрату прибутку, доходів, даних, ділової репутації чи інші нематеріальні втрати, пов'язані з використанням або неможливістю використання сервісу.",
          "Наша сукупна відповідальність перед вами за будь-якими вимогами, що випливають з цих Умов чи сервісу, не перевищує загальної суми комісій (без урахування газу), яку ви сплатили протоколу за 90 днів, що безпосередньо передують події, яка спричинила вимогу.",
        ],
      },
      {
        title: "10. Компенсація",
        body: [
          "Ви погоджуєтесь убезпечити операторів, контриб'юторів та афілійованих осіб SeaBattle від будь-яких вимог, зобов'язань, втрат, збитків чи витрат (включно з розумними судовими витратами), що виникають через порушення вами цих Умов, порушення вами закону чи порушення прав третіх осіб.",
        ],
      },
      {
        title: "11. Зміни Умов",
        body: [
          "Ми можемо оновлювати ці Умови час від часу. Матеріальні зміни зсувають версію згоди, і вам буде запропоновано повторно прийняти Умови при наступному заході. Продовження використання після нематеріальної зміни вважається згодою.",
        ],
      },
      {
        title: "12. Застосовне право і спори",
        body: [
          "Ці Умови регулюються законами нейтральної комерційної юрисдикції, визначеної оператором на момент виникнення спору. Будь-який спір вирішується в обов'язковому арбітражі в індивідуальному порядку; колективні позови і суд присяжних відхиляються в максимально дозволеній законом мірі.",
        ],
      },
      {
        title: "13. Контакти",
        body: [
          "Інциденти, розкриття вразливостей, запити на видалення та загальна кореспонденція: відкрийте issue на https://github.com/hania666/seabattle.",
        ],
      },
    ],
  },
};

export const PRIVACY: Record<Lang, LegalDocument> = {
  en: {
    title: "Privacy Policy",
    effectiveDate: `Effective: ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. Scope",
        body: [
          "This policy explains what data SeaBattle collects, why, and how long we keep it. It applies to the web client and to the matchmaking / result-signing server we operate.",
        ],
      },
      {
        title: "2. Data we collect",
        body: [
          "Wallet address: your public Abstract wallet address, when you connect via Abstract Global Wallet. We use it to address game events to you on-chain and to attribute XP/stats.",
          "IP-derived country and region: we call a third-party geolocation API (ipapi.co) from your browser to determine your approximate country, and for US visitors the state. This is used only to enforce the regional block list and is not stored on our servers.",
          "Match data: every match produces an on-chain record (players, stake, winner, timestamp) which is public and permanent by design of any blockchain. We can read it but cannot delete it.",
          "Server-side match state: while a PvP lobby is open, the matchmaking server holds transient game state (boards, shot history, socket IDs) in memory. It is discarded when the match completes or times out.",
          "Browser storage: we use localStorage to remember your language choice, UI settings (sound volume, etc.), powerup inventory, and the consent record. We do not use advertising or analytics cookies.",
        ],
      },
      {
        title: "3. What we don't collect",
        body: [
          "We do not collect email, phone number, real name, or government ID.",
          "We do not use Google Analytics, Facebook Pixel, or any similar trackers.",
          "We do not sell, rent, or share personal data with third-party advertisers.",
        ],
      },
      {
        title: "4. Third parties",
        body: [
          "Abstract Global Wallet (Privy): authenticates your wallet. Subject to Privy's own privacy policy at https://www.privy.io/privacy-policy.",
          "Abstract chain RPC: every transaction you broadcast is visible to RPC operators and indexers. This is inherent to any public blockchain.",
          "ipapi.co: receives the HTTP request containing your IP when we resolve your region at app start.",
        ],
      },
      {
        title: "5. Retention",
        body: [
          "On-chain data (match results, stakes, winners): permanent, by nature of the blockchain.",
          "Off-chain match state on our server: deleted immediately after the match ends or times out.",
          "Leaderboard entries on our server: kept for as long as the service operates; may be deleted or rotated at any time.",
          "Browser storage: under your control — clear it at any time from browser settings.",
        ],
      },
      {
        title: "6. Your rights",
        body: [
          "GDPR (EU/UK): you have the right to access, rectify, and request deletion of any personal data we hold off-chain. On-chain data cannot be deleted by us. Contact us via GitHub issues to exercise these rights.",
          "CCPA (California): you have the right to know, delete, and opt out of sale. We do not sell personal data.",
        ],
      },
      {
        title: "7. Security",
        body: [
          "We do not hold user funds. We do not hold user private keys. The server-side signer key used to authorize match results is held in a hardened secret store and is scoped only to sign match outcomes.",
          "We do our best but we cannot guarantee perfect security. Report issues at https://github.com/hania666/seabattle.",
        ],
      },
      {
        title: "8. Children",
        body: [
          "SeaBattle is not directed at children under 18. We do not knowingly collect data from anyone under 18.",
        ],
      },
      {
        title: "9. Changes",
        body: [
          "We may update this policy. Material changes bump the consent version, and you will be asked to re-accept on your next visit.",
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    effectiveDate: `Действует с ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. Область применения",
        body: [
          "Политика описывает какие данные собирает SeaBattle, с какой целью и как долго хранит. Она применяется к веб-клиенту и к серверу подбора матчей и подписи результатов.",
        ],
      },
      {
        title: "2. Какие данные мы собираем",
        body: [
          "Адрес кошелька: ваш публичный адрес Abstract, когда вы подключаетесь через Abstract Global Wallet. Используется для адресации событий игры on-chain и учёта XP/статистики.",
          "Страна и регион по IP: мы вызываем сторонний геолокационный API (ipapi.co) из вашего браузера для определения приближённой страны, а для США — штата. Используется только для применения регионального блок-листа и не хранится на наших серверах.",
          "Данные матча: каждый матч даёт запись on-chain (участники, ставка, победитель, время), публичную и постоянную по устройству блокчейна. Мы можем её читать, но не можем удалить.",
          "Серверное состояние матча: пока лобби PvP открыто, сервер подбора держит промежуточное состояние игры (доски, история выстрелов, socket ID) в памяти. Оно уничтожается сразу после завершения матча или таймаута.",
          "Хранилище браузера: мы используем localStorage, чтобы запоминать выбор языка, настройки интерфейса (громкость), инвентарь плюшек и запись согласия. Рекламные и аналитические cookies не используем.",
        ],
      },
      {
        title: "3. Что мы НЕ собираем",
        body: [
          "Мы не собираем email, номер телефона, настоящее имя и документы.",
          "Мы не используем Google Analytics, Facebook Pixel и любые подобные трекеры.",
          "Мы не продаём, не сдаём в аренду и не передаём персональные данные рекламодателям.",
        ],
      },
      {
        title: "4. Сторонние сервисы",
        body: [
          "Abstract Global Wallet (Privy): аутентифицирует ваш кошелёк. Регулируется собственной политикой Privy: https://www.privy.io/privacy-policy.",
          "RPC сети Abstract: каждая транзакция, которую вы отправляете, видна операторам RPC и индексаторам. Это особенность любого публичного блокчейна.",
          "ipapi.co: получает HTTP-запрос с вашим IP, когда мы определяем регион при старте приложения.",
        ],
      },
      {
        title: "5. Сроки хранения",
        body: [
          "Данные on-chain (результаты матчей, ставки, победители): постоянно, по природе блокчейна.",
          "Состояние матча off-chain на нашем сервере: удаляется сразу после окончания матча или таймаута.",
          "Записи лидерборда на нашем сервере: хранятся столько, сколько работает сервис; могут удаляться или ротироваться в любой момент.",
          "Хранилище браузера: под вашим контролем — очищайте в любой момент в настройках браузера.",
        ],
      },
      {
        title: "6. Ваши права",
        body: [
          "GDPR (ЕС/Великобритания): право на доступ, исправление и удаление любых персональных данных off-chain, которыми мы располагаем. On-chain данные мы удалить не можем. Обращайтесь через GitHub issues.",
          "CCPA (Калифорния): право знать, удалять и отказаться от продажи. Мы не продаём персональные данные.",
        ],
      },
      {
        title: "7. Безопасность",
        body: [
          "Мы не храним средства пользователей. Мы не храним их приватные ключи. Серверный ключ подписи для авторизации результатов матча находится в защищённом секретном хранилище и может использоваться только для подписи исходов.",
          "Мы стараемся, но не можем гарантировать идеальную безопасность. Сообщайте о проблемах на https://github.com/hania666/seabattle.",
        ],
      },
      {
        title: "8. Дети",
        body: [
          "SeaBattle не предназначен для лиц младше 18 лет. Мы не собираем осознанно данные от лиц младше 18.",
        ],
      },
      {
        title: "9. Изменения",
        body: [
          "Мы можем обновлять политику. Материальные изменения сдвигают версию согласия, и вам будет предложено повторно принять её при следующем заходе.",
        ],
      },
    ],
  },
  uk: {
    title: "Політика конфіденційності",
    effectiveDate: `Діє з ${EFFECTIVE_DATE}`,
    sections: [
      {
        title: "1. Сфера застосування",
        body: [
          "Політика описує, які дані збирає SeaBattle, з якою метою і як довго зберігає. Вона застосовується до веб-клієнта та сервера добору матчів і підпису результатів.",
        ],
      },
      {
        title: "2. Які дані ми збираємо",
        body: [
          "Адреса гаманця: ваша публічна адреса Abstract, коли ви підключаєтесь через Abstract Global Wallet. Використовується для адресації подій гри on-chain і обліку XP/статистики.",
          "Країна та регіон за IP: ми викликаємо сторонній геолокаційний API (ipapi.co) з вашого браузера для визначення приблизної країни, а для США — штату. Використовується лише для застосування регіонального блок-листа і не зберігається на наших серверах.",
          "Дані матчу: кожен матч дає запис on-chain (учасники, ставка, переможець, час), публічний і постійний за природою блокчейну. Ми можемо його читати, але не можемо видалити.",
          "Серверний стан матчу: поки лобі PvP відкрите, сервер добору тримає проміжний стан гри (дошки, історію пострілів, socket ID) у пам'яті. Він знищується одразу після завершення матчу чи таймауту.",
          "Сховище браузера: ми використовуємо localStorage, аби запам'ятати вибір мови, налаштування інтерфейсу (гучність), інвентар плюшок і запис згоди. Рекламних та аналітичних cookies не використовуємо.",
        ],
      },
      {
        title: "3. Що ми НЕ збираємо",
        body: [
          "Ми не збираємо email, номер телефону, справжнє ім'я та документи.",
          "Ми не використовуємо Google Analytics, Facebook Pixel чи будь-які подібні трекери.",
          "Ми не продаємо, не здаємо в оренду і не передаємо персональні дані рекламодавцям.",
        ],
      },
      {
        title: "4. Сторонні сервіси",
        body: [
          "Abstract Global Wallet (Privy): автентифікує ваш гаманець. Регулюється власною політикою Privy: https://www.privy.io/privacy-policy.",
          "RPC мережі Abstract: кожна транзакція, яку ви надсилаєте, видима операторам RPC та індексаторам. Це особливість будь-якого публічного блокчейну.",
          "ipapi.co: отримує HTTP-запит з вашим IP, коли ми визначаємо регіон при старті застосунку.",
        ],
      },
      {
        title: "5. Терміни зберігання",
        body: [
          "Дані on-chain (результати матчів, ставки, переможці): постійно, за природою блокчейну.",
          "Стан матчу off-chain на нашому сервері: видаляється одразу після завершення матчу чи таймауту.",
          "Записи лідерборду на нашому сервері: зберігаються стільки, скільки працює сервіс; можуть видалятися чи ротуватися в будь-який момент.",
          "Сховище браузера: під вашим контролем — очищайте в будь-який момент у налаштуваннях браузера.",
        ],
      },
      {
        title: "6. Ваші права",
        body: [
          "GDPR (ЄС/Велика Британія): право на доступ, виправлення і видалення будь-яких персональних даних off-chain, якими ми володіємо. On-chain дані ми видалити не можемо. Звертайтеся через GitHub issues.",
          "CCPA (Каліфорнія): право знати, видаляти і відмовитись від продажу. Ми не продаємо персональні дані.",
        ],
      },
      {
        title: "7. Безпека",
        body: [
          "Ми не зберігаємо кошти користувачів. Ми не зберігаємо їхні приватні ключі. Серверний ключ підпису для авторизації результатів матчу знаходиться у захищеному секретному сховищі та може використовуватися лише для підпису результатів.",
          "Ми стараємося, але не можемо гарантувати ідеальну безпеку. Повідомляйте про проблеми на https://github.com/hania666/seabattle.",
        ],
      },
      {
        title: "8. Діти",
        body: [
          "SeaBattle не призначений для осіб молодше 18 років. Ми не збираємо свідомо дані від осіб молодше 18.",
        ],
      },
      {
        title: "9. Зміни",
        body: [
          "Ми можемо оновлювати політику. Матеріальні зміни зсувають версію згоди, і вам буде запропоновано повторно прийняти її при наступному заході.",
        ],
      },
    ],
  },
};
