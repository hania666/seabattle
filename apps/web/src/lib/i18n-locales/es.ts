// Spanish (es) translation dictionary. Keys must mirror those in i18n.ts (en).
// Game/crypto terms (SeaBattle, XP, PvP, PvE, Coins, Bomb, Radar, ETH,
// Easy/Normal/Hard, Юнга/Адмирал rank names) are kept untranslated to match
// the rest of the UI and the on-chain data.

export const dict: Record<string, string> = {
  // Branding
  "brand.name": "SeaBattle",
  "brand.tagline": "Apuesta · Juega · Reclama",
  "brand.era": "Beta cerrada · Abstract Testnet",

  // Closed-beta banner
  "beta.badge": "Beta cerrada · Testnet",
  "beta.copy": "Abstract Sepolia testnet — sin dinero real, los saldos pueden reiniciarse.",
  "beta.banner.aria": "Aviso de beta cerrada",
  "beta.dismiss.aria": "Cerrar",

  // Network mismatch prompt
  "network.wrong": "Red incorrecta — cambia a {{chain}} para jugar.",
  "network.switch": "Cambiar de red",
  "network.switching": "Cambiando…",

  // Bug-report modal
  "nav.feedback": "Reportar un bug",
  "feedback.title": "Reportar un bug",
  "feedback.subtitle": "Cuéntanos qué pasó. Te responderemos si dejas un email.",
  "feedback.message.label": "¿Qué salió mal?",
  "feedback.message.placeholder": "Describe los pasos y lo que esperabas que ocurriera…",
  "feedback.email.label": "Email",
  "feedback.email.optional": "(opcional)",
  "feedback.attached.wallet": "Adjunto: cartera {{address}}",
  "feedback.success": "Gracias — recibido.",
  "feedback.error": "No se pudo enviar. Inténtalo de nuevo en un momento.",
  "feedback.cancel": "Cancelar",
  "feedback.submit": "Enviar",
  "feedback.sending": "Enviando…",
  "feedback.close": "Cerrar",

  // Nav / header
  "nav.home": "Inicio",
  "nav.pve": "Jugar contra bot",
  "nav.pvp": "Arena PvP",
  "nav.profile": "Perfil",
  "nav.leaderboard": "Clasificación",
  "nav.shop": "Tienda",
  "nav.settings": "Ajustes",
  "nav.connect": "Conectar",
  "nav.disconnect": "Desconectar",
  "auth.signIn": "Iniciar sesión",
  "auth.signingIn": "Iniciando…",

  // Home
  "home.title1": "SEA",
  "home.title2": "BATTLE",
  "home.pitch":
    "Apuesta, juega, reclama. El ganador se lleva el {{pct}} del bote on-chain. El modo PvE es prácticamente gratis — solo gas, vence a los bots, sube de Юнга a Адмирал.",
  "home.cta.enter": "AL COMBATE",
  "home.yourRank": "Tu rango",
  "home.xpTo": "{{n}} XP hasta {{rank}}",
  "home.tile.pve.title": "JUGAR vs BOT",
  "home.tile.pve.sub": "XP gratis, comisión mínima",
  "home.tile.pve.desc":
    "Easy es gratis. Normal/Hard cuestan céntimos de testnet ETH. Hunde al bot, acumula XP, sube de rango.",
  "home.tile.pve.cta": "JUGAR",
  "home.tile.pvp.title": "ARENA PvP",
  "home.tile.pvp.sub": "Apuesta · juega · reclama",
  "home.tile.pvp.desc":
    "Elige una apuesta de 0.001 a 0.01 ETH. El ganador reclama el 95 % del bote en una transacción.",
  "home.tile.pvp.cta": "CREAR / UNIRSE",
  "home.tile.leaderboard.title": "CLASIFICACIÓN",
  "home.tile.leaderboard.sub": "Rangos globales",
  "home.tile.leaderboard.desc":
    "Mejores capitanes por XP. Tu posición se actualiza tras cada partida. Tabla diaria y de todos los tiempos.",
  "home.tile.leaderboard.cta": "VER",
  "home.tile.profile.title": "PERFIL",
  "home.tile.profile.sub": "Stats · Tienda · Logros",
  "home.tile.profile.desc":
    "Tu rango, saldo, logros y la tienda de powerups — todo en un mismo lugar.",
  "home.tile.profile.cta": "ABRIR",

  // Settings modal
  "settings.title": "Ajustes",
  "settings.close": "Cerrar ajustes",
  "settings.sfx": "Efectos de sonido",
  "settings.sfx.sub": "Disparos, explosiones, alertas",
  "settings.music": "Música de fondo",
  "settings.music.sub": "Loop ambiental sintético",
  "settings.volume": "Volumen general",
  "settings.lang": "Idioma",
  "settings.note":
    "El sonido usa Web Audio sintetizado — no se descarga nada. Si no oyes nada al activarlo, haz clic una vez en la página.",

  // Fleet
  "fleet.afloat": "A flote",
  "fleet.your": "Tu flota",
  "fleet.enemy": "Flota enemiga",
  "fleet.damaged": "Dañado",
  "fleet.sunk": "Hundido",
  "ship.carrier": "Portaaviones",
  "ship.battleship": "Acorazado",
  "ship.cruiser": "Crucero",
  "ship.submarine": "Submarino",
  "ship.destroyer": "Destructor",

  // PvE
  "pve.title": "Jugar contra bot",
  "pve.subtitle": "Abstract Sepolia · testnet ETH",
  "pve.playing": "Jugando contra",
  "pve.bot": "bot · {{level}}",
  "pve.yourTurn": "Tu turno",
  "pve.botThinking": "El bot piensa…",
  "pve.intro": "Si aciertas, sigues disparando. Si fallas, le toca al bot. No agotes el tiempo.",
  "pve.log": "Registro de batalla",
  "pve.yourShot": "Tu disparo",

  // Powerups (in-game bar)
  "pu.title": "Powerups",
  "pu.none": "Sin powerups. Reclama la caja diaria o pasa por la tienda.",
  "pu.aim.bomb": "Modo bomba · haz clic en una celda para impactar 3×3",
  "pu.aim.radar": "Modo radar · haz clic en una celda para escanear 3×3",
  "pu.cancel": "Cancelar",
  "pu.radarResult": "Radar: {{n}} celdas con barco en 3×3",
  "pu.radarClear": "Radar: aguas despejadas",
  "pu.locked.pvp": "Solo PvP",
  "pu.locked.soon": "Próximamente",

  // Splash
  "splash.tagline": "Apuesta · Juega · Reclama",
  "splash.enter": "Al combate",

  // Shop
  "shop.title": "Tienda de la nave",
  "shop.subtitle": "Gasta Coins en powerups de combate",
  "shop.balance": "Coins",
  "shop.buy": "Comprar",
  "shop.owned": "En inventario",
  "shop.need": "Te faltan {{n}}",
  "shop.full": "Inventario lleno ({{n}})",

  // Coins / rewards
  "coins.label": "Coins",
  "coins.earned": "+{{n}} Coins",
  "coins.migration.grant":
    "Bono de bienvenida: +{{n}} Coins. Coins es una nueva moneda del juego, separada del XP — gástala en la tienda.",

  // PvP mode selector
  "pvp.mode.title": "Formato de partida",
  "pvp.mode.classic.name": "Clásico",
  "pvp.mode.classic.badge": "Habilidad pura",
  "pvp.mode.classic.desc":
    "Sin powerups. El ganador se decide por colocación y lectura del tablero. Recomendado para juego limpio.",
  "pvp.mode.arcade.name": "Arcade",
  "pvp.mode.arcade.badge": "Próximamente",
  "pvp.mode.arcade.desc":
    "Ambos jugadores reciben un kit inicial idéntico (1 Bomba + 1 Radar) que no toca el inventario. Llega en el próximo parche.",

  // Rank / decay messaging (Profile)
  "rank.decay.inactivity":
    "Aviso — si no juegas durante más de {{days}} días, el XP empezará a bajar {{per}} por semana.",
  "rank.decay.losing.streak":
    "Racha de derrotas: {{n}}. Una derrota más te costará {{penalty}} XP.",
  "rank.decay.applied":
    "Penalización por inactividad aplicada: −{{n}} XP. Juega una partida para reiniciar el contador.",
  "shop.daily.title": "Caja diaria",
  "shop.daily.desc": "Bomb + Radar gratis cada 24 horas. Solo abre la tienda.",
  "shop.daily.claim": "Reclamar la caja de hoy",
  "shop.daily.claimed": "Reclamada · vuelve en {{h}}h {{m}}m",
  "shop.bomb.name": "Bomba",
  "shop.bomb.desc": "Impacto en área — golpea un cuadrado 3×3 alrededor de la celda objetivo.",
  "shop.radar.name": "Radar",
  "shop.radar.desc": "Escanea un área 3×3 y muestra cuántas celdas con barco hay dentro (sin coordenadas).",
  "shop.torpedo.name": "Torpedo",
  "shop.torpedo.desc": "Dispara una fila o columna entera. Se detiene en el primer barco impactado.",
  "shop.shield.name": "Escudo",
  "shop.shield.desc": "Bloquea el siguiente disparo que reciba tu flota (solo PvP).",

  // Achievements
  "ach.section.title": "Logros",
  "ach.section.subtitle": "{{n}}/{{total}} desbloqueados · {{coins}} Coins ganados",
  "ach.locked": "Bloqueado",
  "ach.unlocked": "Desbloqueado",
  "ach.reward": "+{{n}} 🪙",
  "ach.toast.title": "Logro desbloqueado",
  "ach.toast.body": "{{title}} · +{{reward}} Coins",
  "ach.title.kraken": "Kraken",
  "ach.title.ghost": "Fantasma",
  "ach.title.admiral": "Almirante de la flota",
  "ach.firstBlood.title": "Primera sangre",
  "ach.firstBlood.desc": "Hunde tu primer barco.",
  "ach.firstWin.title": "Primera salva",
  "ach.firstWin.desc": "Gana tu primera partida.",
  "ach.hundredMatches.title": "Comodoro",
  "ach.hundredMatches.desc": "Juega 100 partidas en total.",
  "ach.fiveHundredMatches.title": "Veterano",
  "ach.fiveHundredMatches.desc": "Juega 500 partidas en total.",
  "ach.tenWinStreak.title": "Imparable",
  "ach.tenWinStreak.desc": "Gana 10 partidas seguidas.",
  "ach.ironFist.title": "Puño de hierro",
  "ach.ironFist.desc": "Gana en Hard sin usar ningún powerup.",
  "ach.quickDraw.title": "Disparo rápido",
  "ach.quickDraw.desc": "Termina una partida en menos de 60 segundos.",
  "ach.silentHunter.title": "Cazador silencioso",
  "ach.silentHunter.desc": "Gana usando 25 disparos o menos.",
  "ach.blindSeer.title": "Vidente ciego",
  "ach.blindSeer.desc": "Gana sin usar radar ni bomba.",
  "ach.rankMatros.title": "Iza la bandera",
  "ach.rankMatros.desc": "Alcanza el rango Marinero.",
  "ach.rankMichman.title": "Vía de oficial",
  "ach.rankMichman.desc": "Alcanza el rango Guardiamarina.",
  "ach.rankLieutenant.title": "Puente de mando",
  "ach.rankLieutenant.desc": "Alcanza el rango Teniente.",
  "ach.rankAdmiral.title": "Almirante de la flota",
  "ach.rankAdmiral.desc": "Alcanza el rango Almirante.",

  // Naval rank labels (used by ranks.ts via labelKey).
  "rank.cabinBoy": "Grumete",
  "rank.sailor": "Marinero",
  "rank.bosun": "Contramaestre",
  "rank.midshipman": "Guardiamarina",
  "rank.lieutenant": "Teniente",
  "rank.commander": "Capitán de Corbeta",
  "rank.captain": "Capitán",
  "rank.admiral": "Almirante",
  "ach.torpedoMaster.title": "Maestro del torpedo",
  "ach.torpedoMaster.desc": "Dispara 10 torpedos.",
  "ach.bombMaster.title": "Demoledor",
  "ach.bombMaster.desc": "Lanza 10 bombas.",
  "ach.shieldBearer.title": "Portador del escudo",
  "ach.shieldBearer.desc": "Usa 5 escudos.",
  "ach.collector.title": "Coleccionista",
  "ach.collector.desc": "Compra al menos uno de cada powerup.",
  "ach.richCaptain.title": "Capitán rico",
  "ach.richCaptain.desc": "Acumula 1.000 Coins a la vez.",
  "ach.dailyRoutine.title": "Rutina diaria",
  "ach.dailyRoutine.desc": "Reclama 7 cajas diarias.",
  "ach.firstTryHard.title": "Suerte de principiante",
  "ach.firstTryHard.desc": "Gana en Hard a la primera.",

  // Legal
  "legal.gate.title": "Una verificación rápida",
  "legal.gate.subtitle": "Antes de entrar al juego",
  "legal.gate.intro":
    "SeaBattle es un juego de habilidad. Puedes jugar gratis (PvE Easy) o apostar testnet/ETH real contra otro jugador. Confirma dos cosas antes de continuar.",
  "legal.gate.age.check": "Tengo al menos 18 años (o la mayoría de edad de mi país).",
  "legal.gate.tos.before": "He leído y acepto los",
  "legal.gate.tos.link": "Términos del Servicio",
  "legal.gate.and": "y",
  "legal.gate.privacy.link": "Política de Privacidad",
  "legal.gate.disclaimer":
    "SeaBattle no se ofrece en los estados de WA, AZ, LA, MT, SD, SC, TN, AR, CT, DE de EE. UU., ni en EAU / Singapur / China / Arabia Saudí / países sancionados. Juega con responsabilidad.",
  "legal.gate.accept": "Entrar a SeaBattle",
  "legal.gate.help": "Ayuda de juego responsable",

  "legal.geo.sanctioned.title": "SeaBattle no está disponible en tu región",
  "legal.geo.country.title": "SeaBattle no está disponible en tu país",
  "legal.geo.state.title": "SeaBattle no está disponible en tu estado",
  "legal.geo.body":
    "Según tu dirección IP, te encuentras en una jurisdicción donde no ofrecemos apuestas con dinero real. Esta decisión no es personal — protege al servicio del riesgo regulatorio local.",
  "legal.geo.detected": "Detectado",
  "legal.geo.disclaimer":
    "Si crees que es un error (p. ej. estás conectado a través de una VPN con salida en una de estas regiones), desactiva la VPN y recarga.",

  "footer.terms": "Términos",
  "footer.privacy": "Privacidad",
  "footer.responsible": "Juego responsable · 1-800-GAMBLER",
  "footer.tagline": "Juego de habilidad · No-custodial · 18+",

  // Common
  "common.back": "Atrás",
  "common.home": "Inicio",
  "common.cancel": "Cancelar",
  "common.confirm": "Confirmar",
  "common.error": "Algo salió mal",
};
