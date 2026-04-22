/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOT_MATCH_ADDRESS?: string;
  readonly VITE_BATTLESHIP_LOBBY_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
