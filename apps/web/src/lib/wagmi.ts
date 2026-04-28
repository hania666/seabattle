import { createConfig, http } from "wagmi";
import { abstractTestnet } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [abstractTestnet],
  transports: {
    [abstractTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
