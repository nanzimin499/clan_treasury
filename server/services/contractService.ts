import { randomUUID } from "node:crypto";

export type ContractFunctionType = "read" | "write";

export type ContractFunction = {
  name: string;
  type: ContractFunctionType;
  role: string;
  description: string;
};

export type InteractionStatus = "success" | "pending" | "failed";

export type InteractionRecord = {
  id: string;
  wallet: string;
  action: string;
  status: InteractionStatus;
  txHash: string;
  timestamp: string;
};

export type FeedbackRecord = {
  id: string;
  role: string;
  score: number;
  comment: string;
  timestamp: string;
};

export type ClanTreasury = {
  clanId: number;
  symbol: string;
  name: string;
  treasuryAdmin: string;
  minDeposit: number;
  withdrawalLimit: number;
  balance: number;
  active: boolean;
};

export type ClanStats = {
  totalMembers: number;
  totalDeposits: number;
  totalDeposited: number;
  pendingSpends: number;
  executedSpends: number;
  cancelledSpends: number;
  totalSpent: number;
};

export type DepositRecord = {
  depositId: number;
  member: string;
  amount: number;
  memo: string;
  recordedAt: string;
};

export type SpendRecord = {
  spendId: number;
  requester: string;
  recipient: string;
  amount: number;
  purpose: string;
  status: "Pending" | "Executed" | "Cancelled";
};

export const contractConfig = {
  projectName: "Clan Treasury Protocol",
  network: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "UPDATE_AFTER_DEPLOY",
  repository: "https://github.com/nanzimin499/clan_treasury"
};

export const contractFunctions: ContractFunction[] = [
  {
    name: "initialize",
    type: "write",
    role: "Admin",
    description: "Creates protocol config and admin authority."
  },
  {
    name: "create_clan",
    type: "write",
    role: "Admin",
    description: "Creates a clan treasury with symbol, admin, deposit rule, and withdrawal limit."
  },
  {
    name: "set_clan_active",
    type: "write",
    role: "Admin",
    description: "Pauses or reactivates a clan treasury."
  },
  {
    name: "add_member",
    type: "write",
    role: "Treasury admin",
    description: "Adds a wallet as an approved clan member."
  },
  {
    name: "record_deposit",
    type: "write",
    role: "Member",
    description: "Records a member treasury deposit."
  },
  {
    name: "request_spend",
    type: "write",
    role: "Treasury admin",
    description: "Creates a pending treasury spend request."
  },
  {
    name: "execute_spend",
    type: "write",
    role: "Treasury admin",
    description: "Executes a pending spend and updates treasury balance."
  },
  {
    name: "cancel_spend",
    type: "write",
    role: "Treasury admin",
    description: "Cancels a pending treasury spend request."
  },
  {
    name: "get_config",
    type: "read",
    role: "Viewer",
    description: "Reads protocol configuration."
  },
  {
    name: "get_clan",
    type: "read",
    role: "Viewer",
    description: "Reads clan treasury state."
  },
  {
    name: "get_member",
    type: "read",
    role: "Viewer",
    description: "Reads clan member role."
  },
  {
    name: "get_deposit",
    type: "read",
    role: "Viewer",
    description: "Reads one deposit record."
  },
  {
    name: "get_spend",
    type: "read",
    role: "Viewer",
    description: "Reads one spend request."
  },
  {
    name: "get_clan_stats",
    type: "read",
    role: "Viewer",
    description: "Reads clan treasury metrics."
  },
  {
    name: "get_member_stats",
    type: "read",
    role: "Viewer",
    description: "Reads member deposit metrics."
  },
  {
    name: "get_audit_count",
    type: "read",
    role: "Viewer",
    description: "Reads total audit record count."
  },
  {
    name: "get_audit_record",
    type: "read",
    role: "Viewer",
    description: "Reads one audit record."
  }
];

const clan: ClanTreasury = {
  clanId: 1,
  symbol: "DRGN",
  name: "Dragon Clan Treasury",
  treasuryAdmin: "GADM...DRGN",
  minDeposit: 10,
  withdrawalLimit: 500,
  balance: 2840,
  active: true
};

const stats: ClanStats = {
  totalMembers: 38,
  totalDeposits: 96,
  totalDeposited: 9420,
  pendingSpends: 3,
  executedSpends: 12,
  cancelledSpends: 2,
  totalSpent: 6580
};

const deposits: DepositRecord[] = [
  {
    depositId: 1,
    member: "GPLY...ANNA",
    amount: 120,
    memo: "Tournament pool deposit",
    recordedAt: new Date().toISOString()
  },
  {
    depositId: 2,
    member: "GPLY...MINH",
    amount: 80,
    memo: "Sponsor reward contribution",
    recordedAt: new Date().toISOString()
  },
  {
    depositId: 3,
    member: "GPLY...LINA",
    amount: 200,
    memo: "Monthly clan fund",
    recordedAt: new Date().toISOString()
  }
];

const spends: SpendRecord[] = [
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

const interactions: InteractionRecord[] = [
  {
    id: "interaction-001",
    wallet: "GPLY...ANNA",
    action: "record_deposit",
    status: "success",
    txHash: "mock-deposit-001",
    timestamp: new Date().toISOString()
  },
  {
    id: "interaction-002",
    wallet: "GADM...DRGN",
    action: "request_spend",
    status: "success",
    txHash: "mock-spend-002",
    timestamp: new Date().toISOString()
  },
  {
    id: "interaction-003",
    wallet: "GADM...DRGN",
    action: "execute_spend",
    status: "success",
    txHash: "mock-execute-003",
    timestamp: new Date().toISOString()
  }
];

const feedback: FeedbackRecord[] = [
  {
    id: "feedback-001",
    role: "Clan admin",
    score: 5,
    comment: "The spend request flow makes treasury spending easier to explain to members.",
    timestamp: new Date().toISOString()
  },
  {
    id: "feedback-002",
    role: "Clan member",
    score: 4,
    comment: "The dashboard makes my contribution history clear.",
    timestamp: new Date().toISOString()
  }
];

export function getHealth() {
  return {
    ok: true,
    service: "clan-treasury-level4-server",
    timestamp: new Date().toISOString()
  };
}

export function getConfig() {
  return contractConfig;
}

export function getContractFunctions() {
  return contractFunctions;
}

export function getClan() {
  return clan;
}

export function getClanStats() {
  return stats;
}

export function getDeposits() {
  return deposits;
}

export function getSpends() {
  return spends;
}

export function getInteractions() {
  return interactions;
}

export function addInteraction(input: {
  wallet: string;
  action: string;
  status?: InteractionStatus;
  txHash?: string;
}) {
  const record: InteractionRecord = {
    id: randomUUID(),
    wallet: input.wallet || "unknown-wallet",
    action: input.action || "unknown-action",
    status: input.status ?? "success",
    txHash: input.txHash || `mock-${Date.now().toString(16)}`,
    timestamp: new Date().toISOString()
  };

  interactions.unshift(record);
  return record;
}

export function getFeedback() {
  return feedback;
}

export function addFeedback(input: {
  role: string;
  score: number;
  comment: string;
}) {
  const safeScore = Math.max(1, Math.min(5, Number(input.score) || 1));

  const record: FeedbackRecord = {
    id: randomUUID(),
    role: input.role || "User",
    score: safeScore,
    comment: input.comment || "No comment provided.",
    timestamp: new Date().toISOString()
  };

  feedback.unshift(record);
  return record;
}

export function getAnalyticsSummary() {
  const totalInteractions = interactions.length;
  const successfulInteractions = interactions.filter((item) => item.status === "success").length;
  const failedInteractions = interactions.filter((item) => item.status === "failed").length;
  const pendingInteractions = interactions.filter((item) => item.status === "pending").length;
  const feedbackCount = feedback.length;
  const scoreSum = feedback.reduce((sum, item) => sum + item.score, 0);

  return {
    totalInteractions,
    successfulInteractions,
    failedInteractions,
    pendingInteractions,
    feedbackCount,
    averageFeedbackScore: feedbackCount === 0 ? 0 : Number((scoreSum / feedbackCount).toFixed(2))
  };
}

export function getProductReadiness() {
  return {
    product: "Clan Treasury Protocol",
    status: "development-ready",
    architecture: {
      smartContract: true,
      frontendDashboard: true,
      backendApi: true,
      analytics: true,
      feedbackCollection: true,
      deploymentConfig: false,
      ciCd: false
    },
    contractFunctions: contractFunctions.map((item) => item.name),
    frontendIntegration: {
      sdkPackage: "@stellar/stellar-sdk",
      contractCallPattern: "new Stellar.Contract(contractId).call(functionName, ...args)",
      mappedFunctionCount: contractFunctions.length
    },
    nextSteps: [
      "Add deployment configuration",
      "Add CI/CD workflow",
      "Deploy contract to Stellar Testnet",
      "Update frontend contract config with deployed contract ID",
      "Collect wallet interactions and user feedback"
    ]
  };
}