export const CONTRACT_CONFIG = {
  network: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "UPDATE_AFTER_DEPLOY",
  projectName: "Clan Treasury Protocol",
  repository: "https://github.com/nanzimin499/clan_treasury"
} as const;

export type ContractConfig = typeof CONTRACT_CONFIG;

export function isDeployedContractConfigured() {
  return /^C[A-Z0-9]{55}$/.test(CONTRACT_CONFIG.contractId);
}