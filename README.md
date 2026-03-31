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

---

## Features

- **ERC-5192 Soulbound Tokens** — non-transferable, permanently tied to student wallets
- **Multi-institution** — owner whitelists authorized issuer institutions
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
