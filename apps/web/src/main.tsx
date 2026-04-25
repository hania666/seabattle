import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstractTestnet } from "viem/chains";
import App from "./App";
import { wagmiConfig } from "./lib/wagmi";
import { ToastProvider } from "./components/ui";
import { initSentry } from "./lib/sentry";
import "./index.css";

initSentry();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AbstractWalletProvider chain={abstractTestnet}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </AbstractWalletProvider>
  </StrictMode>,
);
