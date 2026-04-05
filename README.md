# Credencea — Tamper-Proof Academic Credentials on Ethereum

A full-stack dApp for issuing, managing, and verifying academic credentials as Soulbound Tokens (ERC-5192) on Ethereum.

## Monorepo Structure

```
credencea/
├── contract/     # Hardhat project — Solidity smart contract
└── frontend/     # Vite + React + TypeScript dApp
```

---

## Contract Setup

### Prerequisites
- Node.js >= 18
- An Alchemy or Infura API key (for Sepolia)
- A funded Sepolia wallet (get ETH from https://sepoliafaucet.com)

### Install & Configure

```bash
cd contract
npm install
cp .env.example .env
# Fill in .env with your PRIVATE_KEY and ALCHEMY_API_KEY
```

### Compile

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Copy the deployed contract address into `frontend/.env`.

---

## Frontend Setup

### Prerequisites
- Node.js >= 18
- A Reown (WalletConnect) Project ID — get one free at https://cloud.reown.com
- A Pinata API key — get one at https://pinata.cloud
- Deployed contract address from above

### Install & Configure

```bash
cd frontend
npm install
cp .env.example .env
# Fill in all values in .env
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Self-Onboarding Flow

- Public institution application form: `/onboard`
- Application status lookup: `/onboard/status`
- Owner review queue: `/admin/applications`

The onboarding API lives under `frontend/api/onboard/*`.

- `POST /api/onboard` accepts public institution applications.
- `GET /api/onboard?wallet=0x...` returns the application status history for a wallet.
- `GET /api/onboard` returns the queue consumed by the admin panel.
- `POST /api/onboard/review` records approvals and rejections.

Approval security:

- Approvals are only recorded after the API verifies a successful on-chain `addInstitution(...)` transaction from the current contract owner.
- Rejections require an owner wallet signature.

Persistence:

- If `CREDENCEA_REST_API_KV_REST_API_URL` and `CREDENCEA_REST_API_KV_REST_API_TOKEN` are set, the API stores applications in the configured Vercel KV / Upstash Redis instance.
- Otherwise it falls back to a local JSON file in `/tmp`, which is useful for local development but not durable across serverless cold starts.

---

## Features

- **ERC-5192 Soulbound Tokens** — non-transferable, permanently tied to student wallets
- **Multi-institution** — owner whitelists authorized issuer institutions
- **Self-serve institution onboarding** — institutions apply from a public form, the owner reviews a queue, then activates approved wallets on-chain
- **IPFS metadata** — certificate data stored on IPFS via Pinata, hash on-chain
- **QR code verification** — every certificate gets a verifiable QR link
- **Revocation** — institutions can revoke certificates (e.g. on misconduct)
- **Mobile-friendly** — responsive UI with Tailwind CSS v4 + shadcn/ui
- **Wallet connect** — ReownAppKit supports MetaMask, WalletConnect, Coinbase Wallet

## Tech Stack

| Layer | Tech |
|---|---|
| Smart contract | Solidity 0.8.24, ERC-5192, OpenZeppelin |
| Dev framework | Hardhat + hardhat-toolbox |
| Frontend framework | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui |
| Web3 | Ethers.js v6, ReownAppKit |
| Storage | IPFS via Pinata |
| UX | react-hot-toast, qrcode.react |
| Network | Sepolia testnet |
