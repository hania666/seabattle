import { createConfig, http, injected } from "wagmi";
import { abstractTestnet } from "viem/chains";
import { metaMask } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [abstractTestnet],
  connectors: [
    injected(),
    metaMask(),
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
