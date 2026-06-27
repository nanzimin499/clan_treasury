import * as StellarSdk from "@stellar/stellar-sdk";
import {
  CONTRACT_CONFIG,
  isDeployedContractConfigured
} from "../contractConfig";
import type { ContractFunctionName } from "./contract";

type ScVal = unknown;
type ContractOperation = unknown;

type StellarRuntime = {
  Contract: new (contractId: string) => {
    call: (method: string, ...args: ScVal[]) => ContractOperation;
  };
  Address: new (address: string) => {
    toScVal: () => ScVal;
  };
  Keypair: {
    random: () => {
      publicKey: () => string;
    };
  };
  nativeToScVal: (
    value: string | number | boolean | bigint,
    options?: { type?: string }
  ) => ScVal;
};

const Stellar = StellarSdk as unknown as StellarRuntime;

export type ContractCallMode = "read" | "write";

export type ContractArgumentName =
  | "admin"
  | "protocol_name"
  | "symbol"
  | "name"
  | "treasury_admin"
  | "min_deposit"
  | "withdrawal_limit"
  | "active"
  | "clan_id"
  | "member"
  | "display_name"
  | "amount"
  | "memo"
  | "requester"
  | "recipient"
  | "purpose"
  | "spend_id"
  | "note"
  | "deposit_id"
  | "record_id";

export type FrontendContractMatch = {
  mode: ContractCallMode;
  role: string;
  contractFunction: ContractFunctionName;
  contractArgs: ContractArgumentName[];
  description: string;
};

export type ClanTreasuryInvocationInput = {
  functionName: ContractFunctionName;
  sourcePublicKey?: string;
  adminPublicKey?: string;
  treasuryAdminPublicKey?: string;
  memberPublicKey?: string;
  recipientPublicKey?: string;
  clanId?: number;
  spendId?: number;
  depositId?: number;
  recordId?: number;
  amount?: number;
  minDeposit?: number;
  withdrawalLimit?: number;
  active?: boolean;
  symbol?: string;
  name?: string;
  protocolName?: string;
  displayName?: string;
  memo?: string;
  purpose?: string;
  note?: string;
};

export type StellarInvocationPreview = {
  readyForSigning: boolean;
  functionName: ContractFunctionName;
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  sdkPackage: "@stellar/stellar-sdk";
  frontendMatchedArgs: ContractArgumentName[];
  message: string;
  operation?: ContractOperation;
};

export const FRONTEND_CONTRACT_FUNCTION_MATCH: Record<
  ContractFunctionName,
  FrontendContractMatch
> = {
  initialize: {
    mode: "write",
    role: "Admin",
    contractFunction: "initialize",
    contractArgs: ["admin", "protocol_name"],
    description: "Frontend initializes the clan treasury contract."
  },
  create_clan: {
    mode: "write",
    role: "Admin",
    contractFunction: "create_clan",
    contractArgs: [
      "admin",
      "symbol",
      "name",
      "treasury_admin",
      "min_deposit",
      "withdrawal_limit"
    ],
    description: "Frontend creates a clan treasury with rules and admin."
  },
  set_clan_active: {
    mode: "write",
    role: "Admin",
    contractFunction: "set_clan_active",
    contractArgs: ["admin", "clan_id", "active"],
    description: "Frontend pauses or reactivates a clan treasury."
  },
  add_member: {
    mode: "write",
    role: "Treasury admin",
    contractFunction: "add_member",
    contractArgs: ["admin", "clan_id", "member", "display_name"],
    description: "Frontend adds a wallet as an approved clan member."
  },
  record_deposit: {
    mode: "write",
    role: "Member",
    contractFunction: "record_deposit",
    contractArgs: ["member", "clan_id", "amount", "memo"],
    description: "Frontend records a member treasury deposit."
  },
  request_spend: {
    mode: "write",
    role: "Treasury admin",
    contractFunction: "request_spend",
    contractArgs: ["requester", "clan_id", "recipient", "amount", "purpose"],
    description: "Frontend creates a pending treasury spend request."
  },
  execute_spend: {
    mode: "write",
    role: "Treasury admin",
    contractFunction: "execute_spend",
    contractArgs: ["admin", "spend_id"],
    description: "Frontend executes an approved pending spend."
  },
  cancel_spend: {
    mode: "write",
    role: "Treasury admin",
    contractFunction: "cancel_spend",
    contractArgs: ["admin", "spend_id", "note"],
    description: "Frontend cancels a pending treasury spend."
  },
  get_config: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_config",
    contractArgs: [],
    description: "Frontend reads protocol configuration."
  },
  get_clan: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_clan",
    contractArgs: ["clan_id"],
    description: "Frontend reads one clan treasury."
  },
  get_member: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_member",
    contractArgs: ["member", "clan_id"],
    description: "Frontend reads member role information."
  },
  get_deposit: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_deposit",
    contractArgs: ["deposit_id"],
    description: "Frontend reads one deposit record."
  },
  get_spend: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_spend",
    contractArgs: ["spend_id"],
    description: "Frontend reads one treasury spend request."
  },
  get_clan_stats: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_clan_stats",
    contractArgs: ["clan_id"],
    description: "Frontend reads clan treasury stats."
  },
  get_member_stats: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_member_stats",
    contractArgs: ["member", "clan_id"],
    description: "Frontend reads member deposit stats."
  },
  get_audit_count: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_audit_count",
    contractArgs: [],
    description: "Frontend reads total audit record count."
  },
  get_audit_record: {
    mode: "read",
    role: "Viewer",
    contractFunction: "get_audit_record",
    contractArgs: ["record_id"],
    description: "Frontend reads one audit record."
  }
};

export function getStellarSdkIntegrationStatus() {
  return {
    sdkPackage: "@stellar/stellar-sdk" as const,
    contractId: CONTRACT_CONFIG.contractId,
    contractIdConfigured: isDeployedContractConfigured(),
    rpcUrl: CONTRACT_CONFIG.rpcUrl,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
    matchedFunctions: Object.keys(FRONTEND_CONTRACT_FUNCTION_MATCH)
  };
}

export function buildClanTreasuryInvocation(
  input: ClanTreasuryInvocationInput
): StellarInvocationPreview {
  const match = FRONTEND_CONTRACT_FUNCTION_MATCH[input.functionName];

  if (!isDeployedContractConfigured()) {
    return {
      readyForSigning: false,
      functionName: input.functionName,
      contractId: CONTRACT_CONFIG.contractId,
      rpcUrl: CONTRACT_CONFIG.rpcUrl,
      networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
      sdkPackage: "@stellar/stellar-sdk",
      frontendMatchedArgs: match.contractArgs,
      message:
        "A deployed Stellar Testnet contract ID is required before preparing this call."
    };
  }

  const contract = new Stellar.Contract(CONTRACT_CONFIG.contractId);
  const args = buildArgs(input);
  const operation = contract.call(input.functionName, ...args);

  return {
    readyForSigning: true,
    functionName: input.functionName,
    contractId: CONTRACT_CONFIG.contractId,
    rpcUrl: CONTRACT_CONFIG.rpcUrl,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
    sdkPackage: "@stellar/stellar-sdk",
    frontendMatchedArgs: match.contractArgs,
    operation,
    message: `${input.functionName} Stellar SDK contract operation prepared.`
  };
}

function buildArgs(input: ClanTreasuryInvocationInput): ScVal[] {
  const source = input.sourcePublicKey || Stellar.Keypair.random().publicKey();
  const admin = input.adminPublicKey || source;
  const treasuryAdmin = input.treasuryAdminPublicKey || source;
  const member = input.memberPublicKey || source;
  const recipient = input.recipientPublicKey || source;
  const clanId = input.clanId ?? 1;
  const spendId = input.spendId ?? 1;
  const depositId = input.depositId ?? 1;
  const recordId = input.recordId ?? 1;
  const amount = input.amount ?? 100;
  const minDeposit = input.minDeposit ?? 10;
  const withdrawalLimit = input.withdrawalLimit ?? 500;

  switch (input.functionName) {
    case "initialize":
      return [address(admin), text(input.protocolName ?? "Clan Treasury Protocol")];

    case "create_clan":
      return [
        address(admin),
        text(input.symbol ?? "DRGN"),
        text(input.name ?? "Dragon Clan Treasury"),
        address(treasuryAdmin),
        i128(minDeposit),
        i128(withdrawalLimit)
      ];

    case "set_clan_active":
      return [address(admin), u64(clanId), boolean(input.active ?? true)];

    case "add_member":
      return [
        address(treasuryAdmin),
        u64(clanId),
        address(member),
        text(input.displayName ?? "Dragon Player")
      ];

    case "record_deposit":
      return [
        address(member),
        u64(clanId),
        i128(amount),
        text(input.memo ?? "Tournament treasury deposit")
      ];

    case "request_spend":
      return [
        address(treasuryAdmin),
        u64(clanId),
        address(recipient),
        i128(amount),
        text(input.purpose ?? "Tournament entry fee")
      ];

    case "execute_spend":
      return [address(treasuryAdmin), u64(spendId)];

    case "cancel_spend":
      return [
        address(treasuryAdmin),
        u64(spendId),
        text(input.note ?? "Spend request cancelled")
      ];

    case "get_config":
    case "get_audit_count":
      return [];

    case "get_clan":
    case "get_clan_stats":
      return [u64(clanId)];

    case "get_member":
    case "get_member_stats":
      return [address(member), u64(clanId)];

    case "get_deposit":
      return [u64(depositId)];

    case "get_spend":
      return [u64(spendId)];

    case "get_audit_record":
      return [u64(recordId)];
  }

  return [];
}

function address(publicKey: string): ScVal {
  return new Stellar.Address(publicKey).toScVal();
}

function text(value: string): ScVal {
  return Stellar.nativeToScVal(value, { type: "string" });
}

function i128(value: number): ScVal {
  return Stellar.nativeToScVal(BigInt(value), { type: "i128" });
}

function u64(value: number): ScVal {
  return Stellar.nativeToScVal(BigInt(value), { type: "u64" });
}

function boolean(value: boolean): ScVal {
  return Stellar.nativeToScVal(value, { type: "bool" });
}