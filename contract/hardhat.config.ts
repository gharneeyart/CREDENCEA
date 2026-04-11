import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ETHERLINK_RPC_URL = process.env.ETHERLINK_RPC_URL || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  // networks: {
  //   hardhat: {
  //     chainId: 31337,
  //   },
  //   localhost: {
  //     url: "http://127.0.0.1:8545",
  //     chainId: 31337,
  //   },
  //   sepolia: {
  //     url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  //     accounts: [PRIVATE_KEY],
  //     chainId: 11155111,
  //   },
  // },
  // etherscan: {
  //   apiKey: ETHERSCAN_API_KEY,
  // },
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS === "true",
  //   currency: "USD",
  // },
  // paths: {
  //   sources: "./contracts",
  //   tests: "./test",
  //   cache: "./cache",
  //   artifacts: "./artifacts",
  // },
  networks: {
    etherlinkShadownet: {
      url: `${ETHERLINK_RPC_URL}`,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 127823,
    }
  },
  etherscan: {
    apiKey: {
      'etherlinkShadownet': 'empty'
    },
    customChains: [
      {
        network: "etherlinkShadownet",
        chainId: 127823,
        urls: {
          apiURL: "https://shadownet.explorer.etherlink.com/api",
          browserURL: "https://shadownet.explorer.etherlink.com"
        }
      }
    ]
  }
};

export default config;
