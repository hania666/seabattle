// Portuguese (pt) translation dictionary. Keys must mirror those in i18n.ts (en).
// Game/crypto terms (SeaBattle, XP, PvP, PvE, Coins, Bomb, Radar, ETH,
// Easy/Normal/Hard, Юнга/Адмирал rank names) are kept untranslated.

export const dict: Record<string, string> = {
  // Branding
  "brand.name": "SeaBattle",
  "brand.tagline": "Aposte · Jogue · Resgate",
  "brand.era": "Beta fechada · Abstract Testnet",

  // Closed-beta banner
  "beta.badge": "Beta fechada · Testnet",
  "beta.copy": "Abstract Sepolia testnet — sem dinheiro real, os saldos podem ser zerados.",
  "beta.banner.aria": "Aviso de beta fechada",
  "beta.dismiss.aria": "Fechar",

  // Network mismatch prompt
  "network.wrong": "Rede errada — mude para {{chain}} para jogar.",
  "network.switch": "Trocar de rede",
  "network.switching": "Trocando…",

  // Bug-report modal
  "nav.feedback": "Reportar um bug",
  "feedback.title": "Reportar um bug",
  "feedback.subtitle": "Conta o que aconteceu. A gente responde se você deixar um email.",
  "feedback.message.label": "O que deu errado?",
  "feedback.message.placeholder": "Descreva os passos e o que você esperava acontecer…",
  "feedback.email.label": "Email",
  "feedback.email.optional": "(opcional)",
  "feedback.attached.wallet": "Anexo: carteira {{address}}",
  "feedback.success": "Valeu — recebido.",
  "feedback.error": "Não deu para enviar. Tente de novo daqui a pouco.",
  "feedback.cancel": "Cancelar",
  "feedback.submit": "Enviar",
  "feedback.sending": "Enviando…",
  "feedback.close": "Fechar",

  // Nav / header
  "nav.home": "Início",
  "nav.pve": "Jogar contra bot",
  "nav.pvp": "Arena PvP",
  "nav.profile": "Perfil",
  "nav.leaderboard": "Ranking",
  "nav.shop": "Loja",
  "nav.settings": "Ajustes",
  "nav.connect": "Conectar",
  "nav.disconnect": "Desconectar",
  "auth.signIn": "Entrar",
  "auth.signingIn": "Entrando…",

  // Home
  "home.title1": "SEA",
  "home.title2": "BATTLE",
  "home.pitch":
    "Aposte, jogue, resgate. O vencedor leva {{pct}} do pote on-chain. O modo PvE é praticamente grátis — só o gas, bate os bots, sobe de Юнга a Адмирал.",
  "home.cta.enter": "PARA O COMBATE",
  "home.yourRank": "Seu rank",
  "home.xpTo": "{{n}} XP até {{rank}}",
  "home.tile.pve.title": "JOGAR vs BOT",
  "home.tile.pve.sub": "XP grátis, taxa mínima",
  "home.tile.pve.desc":
    "Easy é grátis. Normal/Hard custam centavos em testnet ETH. Afunde o bot, junte XP, suba de patente.",
  "home.tile.pve.cta": "JOGAR",
  "home.tile.pvp.title": "ARENA PvP",
  "home.tile.pvp.sub": "Aposte · jogue · resgate",
  "home.tile.pvp.desc":
    "Escolha uma aposta de 0.001 a 0.01 ETH. O vencedor resgata 95 % do pote em uma transação.",
  "home.tile.pvp.cta": "CRIAR / ENTRAR",
  "home.tile.leaderboard.title": "RANKING",
  "home.tile.leaderboard.sub": "Posições globais",
  "home.tile.leaderboard.desc":
    "Top capitães por XP. Sua posição atualiza depois de cada partida. Tabelas diárias e geral.",
  "home.tile.leaderboard.cta": "VER",
  "home.tile.profile.title": "PERFIL",
  "home.tile.profile.sub": "Stats · Loja · Conquistas",
  "home.tile.profile.desc":
    "Seu rank, saldo, conquistas e a loja de powerups — tudo num só lugar.",
  "home.tile.profile.cta": "ABRIR",

  // Settings modal
  "settings.title": "Ajustes",
  "settings.close": "Fechar ajustes",
  "settings.sfx": "Efeitos sonoros",
  "settings.sfx.sub": "Tiros, explosões, alertas",
  "settings.music": "Música de fundo",
  "settings.music.sub": "Loop ambiental sintetizado",
  "settings.volume": "Volume geral",
  "settings.lang": "Idioma",
  "settings.note":
    "O som usa síntese Web Audio — nada é baixado. Se você não escutar nada depois de ligar, clique uma vez na página.",

  // Fleet
  "fleet.afloat": "Flutuando",
  "fleet.your": "Sua frota",
  "fleet.enemy": "Frota inimiga",
  "fleet.damaged": "Avariado",
  "fleet.sunk": "Afundado",
  "ship.carrier": "Porta-aviões",
  "ship.battleship": "Encouraçado",
  "ship.cruiser": "Cruzador",
  "ship.submarine": "Submarino",
  "ship.destroyer": "Destroyer",

  // PvE
  "pve.title": "Jogar contra bot",
  "pve.subtitle": "Abstract Sepolia · testnet ETH",
  "pve.playing": "Você joga contra",
  "pve.bot": "bot · {{level}}",
  "pve.yourTurn": "Sua vez",
  "pve.botThinking": "Bot pensando…",
  "pve.intro": "Acertou? Atira de novo. Errou? Vez do bot. Não deixe o tempo acabar.",
  "pve.log": "Log de batalha",
  "pve.yourShot": "Seu tiro",

  // Powerups (in-game bar)
  "pu.title": "Powerups",
  "pu.none": "Sem powerups. Pegue a caixa diária ou passe na loja.",
  "pu.aim.bomb": "Modo bomba · clique uma célula para acertar 3×3",
  "pu.aim.radar": "Modo radar · clique uma célula para escanear 3×3",
  "pu.cancel": "Cancelar",
  "pu.radarResult": "Radar: {{n}} células de navio em 3×3",
  "pu.radarClear": "Radar: águas limpas",
  "pu.locked.pvp": "Só PvP",
  "pu.locked.soon": "Em breve",

  // Splash
  "splash.tagline": "Aposte · Jogue · Resgate",
  "splash.enter": "Para o combate",

  // Shop
  "shop.title": "Loja do navio",
  "shop.subtitle": "Gaste Coins em powerups de combate",
  "shop.balance": "Coins",
  "shop.buy": "Comprar",
  "shop.owned": "No inventário",
  "shop.need": "Faltam {{n}}",
  "shop.full": "Inventário cheio ({{n}})",

  // Coins / rewards
  "coins.label": "Coins",
  "coins.earned": "+{{n}} Coins",
  "coins.migration.grant":
    "Bônus de boas-vindas: +{{n}} Coins. Coins é uma nova moeda do jogo, separada do XP — gaste na loja.",

  // PvP mode selector
  "pvp.mode.title": "Formato da partida",
  "pvp.mode.classic.name": "Clássico",
  "pvp.mode.classic.badge": "Skill puro",
  "pvp.mode.classic.desc":
    "Sem powerups. Quem ganha é quem posiciona melhor e lê o tabuleiro. Recomendado para jogo limpo.",
  "pvp.mode.arcade.name": "Arcade",
  "pvp.mode.arcade.badge": "Em breve",
  "pvp.mode.arcade.desc":
    "Os dois jogadores recebem um kit inicial igual (1 Bomb + 1 Radar) que não mexe no inventário. Chega no próximo patch.",

  // Rank / decay messaging (Profile)
  "rank.decay.inactivity":
    "Atenção — se você ficar mais de {{days}} dias sem jogar, o XP cai {{per}} por semana.",
  "rank.decay.losing.streak":
    "Sequência de derrotas: {{n}}. Mais uma derrota custa {{penalty}} XP.",
  "rank.decay.applied":
    "Penalidade por inatividade aplicada: −{{n}} XP. Jogue uma partida para zerar o timer.",
  "shop.daily.title": "Caixa diária",
  "shop.daily.desc": "Bomb + Radar grátis a cada 24 horas. É só abrir a loja.",
  "shop.daily.claim": "Pegar a caixa de hoje",
  "shop.daily.claimed": "Pegou · volte em {{h}}h {{m}}m",
  "shop.bomb.name": "Bomba",
  "shop.bomb.desc": "Ataque de área — atinge um quadrado 3×3 ao redor da célula alvo.",
  "shop.radar.name": "Radar",
  "shop.radar.desc": "Escaneia uma área 3×3 e mostra quantas células de navio estão dentro (sem coordenadas).",
  "shop.torpedo.name": "Torpedo",
  "shop.torpedo.desc": "Dispara uma linha ou coluna inteira. Para no primeiro navio atingido.",
  "shop.shield.name": "Escudo",
  "shop.shield.desc": "Bloqueia o próximo tiro recebido na sua frota (só PvP).",

  // Achievements
  "ach.section.title": "Conquistas",
  "ach.section.subtitle": "{{n}}/{{total}} desbloqueadas · {{coins}} Coins ganhos",
  "ach.locked": "Bloqueada",
  "ach.unlocked": "Desbloqueada",
  "ach.reward": "+{{n}} 🪙",
  "ach.toast.title": "Conquista desbloqueada",
  "ach.toast.body": "{{title}} · +{{reward}} Coins",
  "ach.title.kraken": "Kraken",
  "ach.title.ghost": "Fantasma",
  "ach.title.admiral": "Almirante da frota",
  "ach.firstBlood.title": "Primeiro sangue",
  "ach.firstBlood.desc": "Afunde seu primeiro navio.",
  "ach.firstWin.title": "Primeira salva",
  "ach.firstWin.desc": "Vença sua primeira partida.",
  "ach.hundredMatches.title": "Comodoro",
  "ach.hundredMatches.desc": "Jogue 100 partidas no total.",
  "ach.fiveHundredMatches.title": "Veterano",
  "ach.fiveHundredMatches.desc": "Jogue 500 partidas no total.",
  "ach.tenWinStreak.title": "Imparável",
  "ach.tenWinStreak.desc": "Vença 10 partidas seguidas.",
  "ach.ironFist.title": "Punho de ferro",
  "ach.ironFist.desc": "Vença no Hard sem nenhum powerup.",
  "ach.quickDraw.title": "Saque rápido",
  "ach.quickDraw.desc": "Termine uma partida em menos de 60 segundos.",
  "ach.silentHunter.title": "Caçador silencioso",
  "ach.silentHunter.desc": "Vença com 25 tiros ou menos.",
  "ach.blindSeer.title": "Vidente cego",
  "ach.blindSeer.desc": "Vença sem usar radar nem bomba.",
  "ach.rankMatros.title": "Hasteie a bandeira",
  "ach.rankMatros.desc": "Alcance o rank Marinheiro.",
  "ach.rankMichman.title": "Carreira de oficial",
  "ach.rankMichman.desc": "Alcance o rank Guarda-marinha.",
  "ach.rankLieutenant.title": "Ponte de comando",
  "ach.rankLieutenant.desc": "Alcance o rank Tenente.",
  "ach.rankAdmiral.title": "Almirante da frota",
  "ach.rankAdmiral.desc": "Alcance o rank Almirante.",

  // Naval rank labels (used by ranks.ts via labelKey).
  "rank.cabinBoy": "Grumete",
  "rank.sailor": "Marinheiro",
  "rank.bosun": "Contramestre",
  "rank.midshipman": "Guarda-marinha",
  "rank.lieutenant": "Tenente",
  "rank.commander": "Capitão-Tenente",
  "rank.captain": "Capitão",
  "rank.admiral": "Almirante",
  "ach.torpedoMaster.title": "Mestre do torpedo",
  "ach.torpedoMaster.desc": "Dispare 10 torpedos.",
  "ach.bombMaster.title": "Demolidor",
  "ach.bombMaster.desc": "Solte 10 bombas.",
  "ach.shieldBearer.title": "Portador do escudo",
  "ach.shieldBearer.desc": "Use 5 escudos.",
  "ach.collector.title": "Colecionador",
  "ach.collector.desc": "Compre pelo menos um de cada powerup.",
  "ach.richCaptain.title": "Capitão rico",
  "ach.richCaptain.desc": "Tenha 1.000 Coins ao mesmo tempo.",
  "ach.dailyRoutine.title": "Rotina diária",
  "ach.dailyRoutine.desc": "Pegue 7 caixas diárias.",
  "ach.firstTryHard.title": "Sorte de iniciante",
  "ach.firstTryHard.desc": "Vença no Hard de primeira.",

  // Legal
  "legal.gate.title": "Uma checagem rápida",
  "legal.gate.subtitle": "Antes de entrar no jogo",
  "legal.gate.intro":
    "SeaBattle é um jogo de skill. Você pode jogar grátis (PvE Easy) ou apostar testnet/ETH real contra outro jogador. Confirme duas coisas antes de seguir.",
  "legal.gate.age.check": "Tenho no mínimo 18 anos (ou a maioridade legal do meu país).",
  "legal.gate.tos.before": "Li e concordo com os",
  "legal.gate.tos.link": "Termos de Uso",
  "legal.gate.and": "e",
  "legal.gate.privacy.link": "Política de Privacidade",
  "legal.gate.disclaimer":
    "SeaBattle não é oferecido nos estados de WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE dos EUA, nem em EAU / Singapura / China / Arábia Saudita / países sancionados. Jogue com responsabilidade.",
  "legal.gate.accept": "Entrar no SeaBattle",
  "legal.gate.help": "Ajuda de jogo responsável",

  "legal.geo.sanctioned.title": "SeaBattle não está disponível na sua região",
  "legal.geo.country.title": "SeaBattle não está disponível no seu país",
  "legal.geo.state.title": "SeaBattle não está disponível no seu estado",
  "legal.geo.body":
    "Pelo seu IP, você está numa jurisdição onde não oferecemos apostas com dinheiro real. A decisão não é pessoal — protege o serviço de riscos regulatórios locais.",
  "legal.geo.detected": "Detectado",
  "legal.geo.disclaimer":
    "Se você acha que isso é um erro (ex.: está conectado via uma VPN com saída numa dessas regiões), desligue a VPN e recarregue.",

  "footer.terms": "Termos",
  "footer.privacy": "Privacidade",
  "footer.responsible": "Jogo responsável · 1-800-GAMBLER",
  "footer.tagline": "Jogo de skill · Não-custodial · 18+",

  // Common
  "common.back": "Voltar",
  "common.home": "Início",
  "common.cancel": "Cancelar",
  "common.confirm": "Confirmar",
  "common.error": "Algo deu errado",
};
