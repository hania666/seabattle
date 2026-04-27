import { createConfig, http, injected } from "wagmi";
import { abstractTestnet } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [abstractTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [abstractTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
