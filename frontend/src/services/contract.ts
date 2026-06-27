import { CONTRACT_CONFIG, isDeployedContractConfigured } from "../contractConfig";
import {
  FRONTEND_CONTRACT_FUNCTION_MATCH,
  buildClanTreasuryInvocation,
  getStellarSdkIntegrationStatus,
  type StellarInvocationPreview
} from "./stellarContractClient";

export type ContractFunctionName =
  | "initialize"
  | "create_clan"
  | "set_clan_active"
  | "add_member"
  | "record_deposit"
  | "request_spend"
  | "execute_spend"
  | "cancel_spend"
  | "get_config"
  | "get_clan"
  | "get_member"
  | "get_deposit"
  | "get_spend"
  | "get_clan_stats"
  | "get_member_stats"
  | "get_audit_count"
  | "get_audit_record";

export type ContractFunction = {
  name: ContractFunctionName;
  type: "write" | "read";
  label: string;
  description: string;
  requiredRole: string;
};

export type ClanView = {
  clanId: number;
  symbol: string;
  name: string;
  treasuryAdmin: string;
  minDeposit: number;
  withdrawalLimit: number;
  balance: number;
  active: boolean;
};

export type ClanStatsView = {
  totalMembers: number;
  totalDeposits: number;
  totalDeposited: number;
  pendingSpends: number;
  executedSpends: number;
  cancelledSpends: number;
  totalSpent: number;
};

export type DepositView = {
  depositId: number;
  member: string;
  amount: number;
  memo: string;
  recordedAt: string;
};

export type SpendView = {
  spendId: number;
  requester: string;
  recipient: string;
  amount: number;
  purpose: string;
  status: "Pending" | "Executed" | "Cancelled";
};

export type ContractActionResult = {
  ok: boolean;
  functionName: ContractFunctionName;
  message: string;
  txHash: string;
  explorerUrl: string;
  sdkPreview: StellarInvocationPreview;
};

export const CONTRACT_FUNCTIONS: ContractFunction[] = [
  { name: "initialize", type: "write", label: "Initialize protocol", description: "Creates protocol config and admin authority.", requiredRole: "Admin" },
  { name: "create_clan", type: "write", label: "Create clan", description: "Creates a clan treasury with symbol, admin, deposit rule, and withdrawal limit.", requiredRole: "Admin" },
  { name: "set_clan_active", type: "write", label: "Set clan active", description: "Pauses or reactivates a clan treasury.", requiredRole: "Admin" },
  { name: "add_member", type: "write", label: "Add member", description: "Adds a wallet as an approved clan member.", requiredRole: "Treasury admin" },
  { name: "record_deposit", type: "write", label: "Record deposit", description: "Records a member treasury deposit.", requiredRole: "Member" },
  { name: "request_spend", type: "write", label: "Request spend", description: "Creates a pending treasury spend request.", requiredRole: "Treasury admin" },
  { name: "execute_spend", type: "write", label: "Execute spend", description: "Executes a pending spend and updates treasury balance.", requiredRole: "Treasury admin" },
  { name: "cancel_spend", type: "write", label: "Cancel spend", description: "Cancels a pending treasury spend request.", requiredRole: "Treasury admin" },
  { name: "get_config", type: "read", label: "Get config", description: "Reads platform config.", requiredRole: "Viewer" },
  { name: "get_clan", type: "read", label: "Get clan", description: "Reads clan treasury state.", requiredRole: "Viewer" },
  { name: "get_member", type: "read", label: "Get member", description: "Reads clan member role.", requiredRole: "Viewer" },
  { name: "get_deposit", type: "read", label: "Get deposit", description: "Reads one deposit record.", requiredRole: "Viewer" },
  { name: "get_spend", type: "read", label: "Get spend", description: "Reads one spend request.", requiredRole: "Viewer" },
  { name: "get_clan_stats", type: "read", label: "Get clan stats", description: "Reads clan treasury metrics.", requiredRole: "Viewer" },
  { name: "get_member_stats", type: "read", label: "Get member stats", description: "Reads member deposit metrics.", requiredRole: "Viewer" },
  { name: "get_audit_count", type: "read", label: "Get audit count", description: "Reads total audit record count.", requiredRole: "Viewer" },
  { name: "get_audit_record", type: "read", label: "Get audit record", description: "Reads one audit record.", requiredRole: "Viewer" }
];

export const FRONTEND_TO_CONTRACT_FUNCTION_MATCH =
  FRONTEND_CONTRACT_FUNCTION_MATCH;

export const MOCK_CLAN: ClanView = {
  clanId: 1,
  symbol: "DRGN",
  name: "Dragon Clan Treasury",
  treasuryAdmin: "GADM...DRGN",
  minDeposit: 10,
  withdrawalLimit: 500,
  balance: 2840,
  active: true
};

export const MOCK_STATS: ClanStatsView = {
  totalMembers: 38,
  totalDeposits: 96,
  totalDeposited: 9420,
  pendingSpends: 3,
  executedSpends: 12,
  cancelledSpends: 2,
  totalSpent: 6580
};

export const MOCK_DEPOSITS: DepositView[] = [
  {
    depositId: 1,
    member: "GPLY...ANNA",
    amount: 120,
    memo: "Tournament pool deposit",
    recordedAt: "2 minutes ago"
  },
  {
    depositId: 2,
    member: "GPLY...MINH",
    amount: 80,
    memo: "Sponsor reward contribution",
    recordedAt: "14 minutes ago"
  },
  {
    depositId: 3,
    member: "GPLY...LINA",
    amount: 200,
    memo: "Monthly clan fund",
    recordedAt: "31 minutes ago"
  }
];

export const MOCK_SPENDS: SpendView[] = [
  {
    spendId: 1,
    requester: "GADM...DRGN",
    recipient: "GORG...TOUR",
    amount: 300,
    purpose: "Tournament registration",
    status: "Executed"
  },
  {
    spendId: 2,
    requester: "GADM...DRGN",
    recipient: "GDES...SHOP",
    amount: 220,
    purpose: "Team jersey order",
    status: "Pending"
  },
  {
    spendId: 3,
    requester: "GADM...DRGN",
    recipient: "GTRV...BUS",
    amount: 150,
    purpose: "Cancelled travel support",
    status: "Cancelled"
  }
];

export function getContractExplorerUrl(): string {
  if (!isDeployedContractConfigured()) {
    return CONTRACT_CONFIG.explorerBaseUrl;
  }

  return `${CONTRACT_CONFIG.explorerBaseUrl}/contract/${CONTRACT_CONFIG.contractId}`;
}

export function getFrontendContractIntegrationStatus() {
  return {
    ...getStellarSdkIntegrationStatus(),
    frontendFunctionCount: CONTRACT_FUNCTIONS.length,
    mappedFunctionCount: Object.keys(FRONTEND_TO_CONTRACT_FUNCTION_MATCH).length,
    allFrontendFunctionsMapped: CONTRACT_FUNCTIONS.every(
      (item) => FRONTEND_TO_CONTRACT_FUNCTION_MATCH[item.name]
    )
  };
}

export async function simulateContractAction(
  functionName: ContractFunctionName,
  sourcePublicKey?: string
): Promise<ContractActionResult> {
  await new Promise((resolve) => setTimeout(resolve, 320));

  const sdkPreview = buildClanTreasuryInvocation({
    functionName,
    sourcePublicKey
  });

  const txHash = `sdk-${functionName}-${Date.now().toString(16)}`;

  return {
    ok: sdkPreview.readyForSigning,
    functionName,
    message: sdkPreview.message,
    txHash,
    explorerUrl: `${CONTRACT_CONFIG.explorerBaseUrl}/tx/${txHash}`,
    sdkPreview
  };
}