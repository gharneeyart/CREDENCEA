// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://v2.hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CredenceaModule = buildModule("CredenceaModule", (m) => {

  const credencea = m.contract("Credencea");

  return { credencea };
});

export default CredenceaModule;
