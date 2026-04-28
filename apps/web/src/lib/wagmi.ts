import { createConfig, http } from "wagmi";
import { abstractTestnet } from "viem/chains";
import { abstractWalletConnector } from "@abstract-foundation/agw-react/connectors";

export const wagmiConfig = createConfig({
  chains: [abstractTestnet],
  connectors: [abstractWalletConnector()],
  transports: {
    [abstractTestnet.id]: http(),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
