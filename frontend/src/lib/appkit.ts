import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { sepolia, hardhat } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { CHAIN_ID } from "@/lib/contract";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;

if (!projectId) {
  console.warn("VITE_REOWN_PROJECT_ID not set — wallet connect will not work");
}

const ethersAdapter = new EthersAdapter();

// Pick active network based on VITE_CHAIN_ID
const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  CHAIN_ID === 31337
    ? [hardhat, sepolia]
    : [sepolia, hardhat];

export const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks,
  projectId: projectId ?? "demo",
  metadata: {
    name: "Credencea",
    description: "Tamper-proof academic credentials on Ethereum",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons: ["/cert-icon.svg"],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#6366f1",
    "--w3m-border-radius-master": "8px",
  },
});
