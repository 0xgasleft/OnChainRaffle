// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const RAFFLE_EXEC = [""];

module.exports = buildModule("OnChainRaffleModule", (m) => {

  const ocr = m.contract("OnChainRaffle", [RAFFLE_EXEC]);

  return { ocr };
});
