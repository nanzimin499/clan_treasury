import { beforeEach, describe, expect, it } from "vitest";
import {
  CONTRACT_FUNCTIONS,
  FRONTEND_TO_CONTRACT_FUNCTION_MATCH,
  getFrontendContractIntegrationStatus,
  simulateContractAction
} from "./contract";
import {
  clearAnalyticsEvents,
  getAnalyticsEvents,
  getAnalyticsSummary,
  trackEvent
} from "./analytics";

describe("Clan Treasury frontend contract integration", () => {
  beforeEach(() => {
    clearAnalyticsEvents();
  });

  it("maps every frontend function to the Soroban contract function with the same name", () => {
    for (const item of CONTRACT_FUNCTIONS) {
      expect(FRONTEND_TO_CONTRACT_FUNCTION_MATCH[item.name]).toBeDefined();
      expect(FRONTEND_TO_CONTRACT_FUNCTION_MATCH[item.name].contractFunction).toBe(item.name);
    }
  });

  it("keeps the expected ClanTreasury contract function set", () => {
    const names = CONTRACT_FUNCTIONS.map((item) => item.name);

    expect(names).toEqual([
      "initialize",
      "create_clan",
      "set_clan_active",
      "add_member",
      "record_deposit",
      "request_spend",
      "execute_spend",
      "cancel_spend",
      "get_config",
      "get_clan",
      "get_member",
      "get_deposit",
      "get_spend",
      "get_clan_stats",
      "get_member_stats",
      "get_audit_count",
      "get_audit_record"
    ]);
  });

  it("exposes Stellar SDK integration details", () => {
    const status = getFrontendContractIntegrationStatus();

    expect(status.sdkPackage).toBe("@stellar/stellar-sdk");
    expect(status.frontendFunctionCount).toBe(17);
    expect(status.mappedFunctionCount).toBe(17);
    expect(status.allFrontendFunctionsMapped).toBe(true);
  });

  it("prepares a Stellar SDK contract invocation preview", async () => {
    const result = await simulateContractAction("record_deposit");

    expect(result.functionName).toBe("record_deposit");
    expect(result.sdkPreview.sdkPackage).toBe("@stellar/stellar-sdk");
    expect(result.sdkPreview.frontendMatchedArgs).toContain("member");
    expect(result.sdkPreview.frontendMatchedArgs).toContain("amount");
  });

  it("tracks wallet and contract analytics", () => {
    trackEvent("wallet_connected", { network: "testnet" });
    trackEvent("contract_action_success", { action: "record_deposit" });

    expect(getAnalyticsEvents().length).toBe(2);
    expect(getAnalyticsSummary().walletEvents).toBe(1);
    expect(getAnalyticsSummary().contractEvents).toBe(1);
  });
});