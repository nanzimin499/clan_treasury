import { describe, expect, it } from "vitest";
import {
  addFeedback,
  addInteraction,
  getAnalyticsSummary,
  getClan,
  getClanStats,
  getConfig,
  getContractFunctions,
  getDeposits,
  getProductReadiness,
  getSpends
} from "../services/contractService.js";

describe("clan treasury backend service", () => {
  it("returns runtime config for Stellar testnet", () => {
    const config = getConfig();

    expect(config.projectName).toBe("Clan Treasury Protocol");
    expect(config.network).toBe("Stellar Testnet");
    expect(config.repository).toContain("nanzimin499/clan_treasury");
  });

  it("maps backend function list to contract functions", () => {
    const names = getContractFunctions().map((item) => item.name);

    expect(names).toContain("create_clan");
    expect(names).toContain("record_deposit");
    expect(names).toContain("request_spend");
    expect(names).toContain("execute_spend");
    expect(names).toContain("get_clan_stats");
    expect(names.length).toBe(17);
  });

  it("returns clan treasury stats", () => {
    const clan = getClan();
    const stats = getClanStats();

    expect(clan.symbol).toBe("DRGN");
    expect(stats.totalMembers).toBeGreaterThan(0);
    expect(stats.totalDeposited).toBeGreaterThan(0);
  });

  it("returns deposit and spend records", () => {
    const deposits = getDeposits();
    const spends = getSpends();

    expect(deposits.length).toBeGreaterThan(0);
    expect(spends.length).toBeGreaterThan(0);
  });

  it("summarizes interactions and feedback", () => {
    addInteraction({
      wallet: "GTEST...USER",
      action: "record_deposit",
      status: "success",
      txHash: "mock-test"
    });

    addFeedback({
      role: "Clan member",
      score: 5,
      comment: "Clear treasury flow."
    });

    const summary = getAnalyticsSummary();

    expect(summary.totalInteractions).toBeGreaterThanOrEqual(1);
    expect(summary.feedbackCount).toBeGreaterThanOrEqual(1);
    expect(summary.averageFeedbackScore).toBeGreaterThan(0);
  });

  it("returns product readiness coverage", () => {
    const readiness = getProductReadiness();

    expect(readiness.product).toBe("Clan Treasury Protocol");
    expect(readiness.architecture.smartContract).toBe(true);
    expect(readiness.architecture.frontendDashboard).toBe(true);
    expect(readiness.architecture.backendApi).toBe(true);
    expect(readiness.frontendIntegration.sdkPackage).toBe("@stellar/stellar-sdk");
    expect(readiness.contractFunctions).toContain("record_deposit");
  });
});