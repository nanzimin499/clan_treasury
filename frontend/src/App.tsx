import { useMemo, useState } from "react";
import { CONTRACT_CONFIG } from "./contractConfig";
import {
  CONTRACT_FUNCTIONS,
  MOCK_CLAN,
  MOCK_DEPOSITS,
  MOCK_SPENDS,
  MOCK_STATS,
  getContractExplorerUrl,
  getFrontendContractIntegrationStatus,
  simulateContractAction,
  type ContractFunctionName
} from "./services/contract";
import { fetchClan, fetchClanStats, fetchInteractions, type InteractionRecord } from "./services/api";
import { getAnalyticsEvents, getAnalyticsSummary, trackEvent } from "./services/analytics";

declare global {
  interface Window {
    freighterApi?: {
      isConnected?: () => Promise<boolean>;
      requestAccess?: () => Promise<string | { address?: string }>;
      getPublicKey?: () => Promise<string>;
      getAddress?: () => Promise<{ address?: string }>;
      signTransaction?: (
        xdr: string,
        options?: { networkPassphrase?: string; address?: string }
      ) => Promise<string>;
    };
  }
}

type WalletState = {
  connected: boolean;
  publicKey: string;
};

type UiStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
  txHash?: string;
};

function shorten(value: string) {
  if (!value) {
    return "Not connected";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: ""
  });
  const [status, setStatus] = useState<UiStatus>({
    type: "idle",
    message: "Ready to connect wallet and prepare clan treasury actions."
  });
  const [selectedAction, setSelectedAction] =
    useState<ContractFunctionName>("record_deposit");
  const [clan, setClan] = useState(MOCK_CLAN);
  const [stats, setStats] = useState(MOCK_STATS);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const integrationStatus = getFrontendContractIntegrationStatus();
  const analyticsSummary = getAnalyticsSummary();
  const analyticsEvents = getAnalyticsEvents();

  const writeFunctions = useMemo(
    () => CONTRACT_FUNCTIONS.filter((item) => item.type === "write"),
    []
  );

  const readFunctions = useMemo(
    () => CONTRACT_FUNCTIONS.filter((item) => item.type === "read"),
    []
  );

  async function connectWallet() {
    setStatus({
      type: "loading",
      message: "Checking Freighter wallet..."
    });

    try {
      if (!window.freighterApi) {
        setStatus({
          type: "error",
          message: "Freighter wallet was not found in this browser."
        });
        trackEvent("wallet_not_found", { network: CONTRACT_CONFIG.network });
        return;
      }

      const access = await window.freighterApi.requestAccess?.();
      const accessAddress =
        typeof access === "string" ? access : access?.address ?? "";

      const addressResponse = await window.freighterApi.getAddress?.();
      const publicKey =
        accessAddress ||
        addressResponse?.address ||
        (await window.freighterApi.getPublicKey?.()) ||
        "";

      if (!publicKey) {
        setStatus({
          type: "error",
          message: "Wallet permission was not approved."
        });
        trackEvent("wallet_permission_missing", { network: CONTRACT_CONFIG.network });
        return;
      }

      setWallet({
        connected: true,
        publicKey
      });

      setStatus({
        type: "success",
        message: "Wallet connected. Contract actions can now be prepared."
      });

      trackEvent("wallet_connected", {
        network: CONTRACT_CONFIG.network,
        hasPublicKey: true
      });
    } catch {
      setStatus({
        type: "error",
        message: "Wallet connection failed or was rejected."
      });
      trackEvent("wallet_connection_failed", { network: CONTRACT_CONFIG.network });
    }
  }

  function disconnectWallet() {
    setWallet({
      connected: false,
      publicKey: ""
    });
    setStatus({
      type: "idle",
      message: "Wallet disconnected."
    });
    trackEvent("wallet_disconnected", {});
  }

  async function refreshData() {
    setStatus({
      type: "loading",
      message: "Refreshing clan treasury data..."
    });

    const [nextClan, nextStats, nextInteractions] = await Promise.all([
      fetchClan(),
      fetchClanStats(),
      fetchInteractions()
    ]);

    setClan(nextClan);
    setStats(nextStats);
    setInteractions(nextInteractions);

    setStatus({
      type: "success",
      message: "Dashboard data refreshed."
    });

    trackEvent("dashboard_data_refreshed", {
      deposits: nextStats.totalDeposits,
      interactions: nextInteractions.length
    });
  }

  async function runContractAction() {
    if (!wallet.connected) {
      setStatus({
        type: "error",
        message: "Connect Freighter before preparing a contract action."
      });
      trackEvent("contract_action_blocked", {
        action: selectedAction,
        reason: "wallet_not_connected"
      });
      return;
    }

    setStatus({
      type: "loading",
      message: `Preparing ${selectedAction} with @stellar/stellar-sdk...`
    });

    const result = await simulateContractAction(selectedAction, wallet.publicKey);

    setInteractions((current) => [
      {
        id: result.txHash,
        wallet: shorten(wallet.publicKey),
        action: result.functionName,
        status: "success",
        txHash: result.txHash,
        timestamp: "just now"
      },
      ...current
    ]);

    setStatus({
      type: "success",
      message: result.message,
      txHash: result.txHash
    });

    trackEvent("contract_action_success", {
      action: selectedAction,
      readyForSigning: result.sdkPreview.readyForSigning
    });
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Soroban Level 4 MVP</p>
          <h1>Clan Treasury Protocol</h1>
        </div>

        <div className="wallet-card">
          <span>{shorten(wallet.publicKey)}</span>
          {wallet.connected ? (
            <button className="secondary-button" onClick={disconnectWallet}>
              Disconnect
            </button>
          ) : (
            <button className="primary-button" onClick={connectWallet}>
              Connect Freighter
            </button>
          )}
        </div>
      </nav>

      <section className="hero-grid">
        <article className="hero-card">
          <p className="eyebrow">Transparent gaming clan treasury</p>
          <h2>Track deposits, spend requests, and clan treasury balance on Stellar.</h2>
          <p>
            Clan Treasury Protocol upgrades a simple testnet XLM treasury flow into
            a Soroban-powered treasury system for gaming clans, student esports
            clubs, sponsors, and tournament organizers.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={refreshData}>
              Refresh dashboard
            </button>
            <a className="link-button" href={getContractExplorerUrl()} target="_blank" rel="noreferrer">
              Open explorer
            </a>
          </div>
        </article>

        <article className="contract-card">
          <p className="eyebrow">Contract runtime</p>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>{CONTRACT_CONFIG.network}</dd>
            </div>
            <div>
              <dt>SDK</dt>
              <dd>{integrationStatus.sdkPackage}</dd>
            </div>
            <div>
              <dt>Contract ID</dt>
              <dd>{CONTRACT_CONFIG.contractId}</dd>
            </div>
            <div>
              <dt>Mapped functions</dt>
              <dd>{integrationStatus.mappedFunctionCount}/{integrationStatus.frontendFunctionCount}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="metrics-grid">
        <article>
          <span>Treasury balance</span>
          <strong>{formatNumber(clan.balance)}</strong>
        </article>
        <article>
          <span>Total members</span>
          <strong>{stats.totalMembers}</strong>
        </article>
        <article>
          <span>Total deposits</span>
          <strong>{formatNumber(stats.totalDeposited)}</strong>
        </article>
        <article>
          <span>Total spent</span>
          <strong>{formatNumber(stats.totalSpent)}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Clan</p>
              <h3>{clan.name}</h3>
            </div>
            <span className="pill">{clan.active ? "active" : "paused"}</span>
          </div>

          <dl className="campaign-grid">
            <div>
              <dt>Symbol</dt>
              <dd>{clan.symbol}</dd>
            </div>
            <div>
              <dt>Treasury admin</dt>
              <dd>{clan.treasuryAdmin}</dd>
            </div>
            <div>
              <dt>Min deposit</dt>
              <dd>{clan.minDeposit}</dd>
            </div>
            <div>
              <dt>Withdrawal limit</dt>
              <dd>{clan.withdrawalLimit}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Contract action</p>
              <h3>Stellar SDK call preview</h3>
            </div>
          </div>

          <label className="field-label" htmlFor="contract-action">
            Select write function
          </label>
          <select
            id="contract-action"
            value={selectedAction}
            onChange={(event) =>
              setSelectedAction(event.target.value as ContractFunctionName)
            }
          >
            {writeFunctions.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>

          <button className="primary-button full-width" onClick={runContractAction}>
            Prepare selected contract call
          </button>

          <div className={`status-box ${status.type}`}>
            <strong>{status.type.toUpperCase()}</strong>
            <p>{status.message}</p>
            {status.txHash ? <code>{status.txHash}</code> : null}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Treasury deposits</p>
              <h3>Recent deposits</h3>
            </div>
            <span className="pill">{MOCK_DEPOSITS.length} records</span>
          </div>

          <div className="record-list">
            {MOCK_DEPOSITS.map((deposit) => (
              <div className="record-row" key={deposit.depositId}>
                <div>
                  <strong>Deposit #{deposit.depositId}</strong>
                  <p>{deposit.member} · {deposit.memo}</p>
                </div>
                <span>{deposit.amount}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Spend workflow</p>
              <h3>Spend requests</h3>
            </div>
            <span className="pill">{MOCK_SPENDS.length} records</span>
          </div>

          <div className="record-list">
            {MOCK_SPENDS.map((spend) => (
              <div className="record-row" key={spend.spendId}>
                <div>
                  <strong>Spend #{spend.spendId}</strong>
                  <p>{spend.purpose} · {spend.recipient}</p>
                </div>
                <span className={`status-pill ${spend.status.toLowerCase()}`}>
                  {spend.status}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Frontend to contract match</p>
              <h3>Function coverage</h3>
            </div>
            <span className="pill">
              {integrationStatus.allFrontendFunctionsMapped ? "matched" : "incomplete"}
            </span>
          </div>

          <div className="function-list">
            {[...writeFunctions, ...readFunctions].map((item) => (
              <div className="function-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                </div>
                <span>{item.requiredRole}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Wallet interaction proof</p>
              <h3>Recent actions</h3>
            </div>
            <span className="pill">{interactions.length} records</span>
          </div>

          <div className="activity-list">
            {interactions.length === 0 ? (
              <p className="muted">Refresh data or prepare a contract call to populate this list.</p>
            ) : (
              interactions.map((item) => (
                <div className="activity-row" key={item.id}>
                  <div>
                    <strong>{item.action}</strong>
                    <p>{item.wallet} · {item.timestamp}</p>
                  </div>
                  <span>{item.status}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Monitoring summary</h3>
            </div>
          </div>

          <div className="metrics-grid compact">
            <article>
              <span>Events</span>
              <strong>{analyticsSummary.trackedEvents}</strong>
            </article>
            <article>
              <span>Wallet</span>
              <strong>{analyticsSummary.walletEvents}</strong>
            </article>
            <article>
              <span>Contract</span>
              <strong>{analyticsSummary.contractEvents}</strong>
            </article>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Event stream</p>
              <h3>Latest telemetry</h3>
            </div>
          </div>

          <div className="activity-list">
            {analyticsEvents.length === 0 ? (
              <p className="muted">No events yet.</p>
            ) : (
              analyticsEvents.slice(0, 5).map((event) => (
                <div className="activity-row" key={`${event.name}-${event.timestamp}`}>
                  <div>
                    <strong>{event.name}</strong>
                    <p>{event.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;