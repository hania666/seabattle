/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOT_MATCH_ADDRESS?: string;
  readonly VITE_BATTLESHIP_LOBBY_ADDRESS?: string;
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
