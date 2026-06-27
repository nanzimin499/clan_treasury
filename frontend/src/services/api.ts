import {
  MOCK_CLAN,
  MOCK_DEPOSITS,
  MOCK_SPENDS,
  MOCK_STATS,
  type ClanStatsView,
  type ClanView,
  type DepositView,
  type SpendView
} from "./contract";

export type InteractionRecord = {
  id: string;
  wallet: string;
  action: string;
  status: "success" | "pending" | "failed";
  txHash: string;
  timestamp: string;
};

const interactions: InteractionRecord[] = [
  {
    id: "interaction-001",
    wallet: "GPLY...ANNA",
    action: "record_deposit",
    status: "success",
    txHash: "mock-deposit-001",
    timestamp: "2 minutes ago"
  },
  {
    id: "interaction-002",
    wallet: "GADM...DRGN",
    action: "request_spend",
    status: "success",
    txHash: "mock-spend-002",
    timestamp: "9 minutes ago"
  }
];

export async function fetchClan(): Promise<ClanView> {
  await wait();
  return MOCK_CLAN;
}

export async function fetchClanStats(): Promise<ClanStatsView> {
  await wait();
  return MOCK_STATS;
}

export async function fetchDeposits(): Promise<DepositView[]> {
  await wait();
  return MOCK_DEPOSITS;
}

export async function fetchSpends(): Promise<SpendView[]> {
  await wait();
  return MOCK_SPENDS;
}

export async function fetchInteractions(): Promise<InteractionRecord[]> {
  await wait();
  return interactions;
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, 160));
}