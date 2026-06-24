import { useMemo, useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  getAddress,
  isConnected,
  requestAccess,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";

type TxStatus = "idle" | "pending" | "success" | "failed";

type FreighterConnectionResponse =
  | boolean
  | {
      isConnected?: boolean;
      error?: string;
    };

type FreighterAddressResponse =
  | string
  | {
      address?: string;
      error?: string;
    };

type FreighterSignResponse =
  | string
  | {
      signedTxXdr?: string;
      signerAddress?: string;
      error?: string;
    };

type Clan = {
  symbol: string;
  name: string;
  game: string;
  targetPool: number;
  suggestedDeposit: number;
  members: number;
  description: string;
};

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

const clans: Clan[] = [
  {
    symbol: "DRGN",
    name: "Dragon Vanguard",
    game: "Fantasy MMO",
    targetPool: 250,
    suggestedDeposit: 1,
    members: 48,
    description:
      "A competitive MMO clan building a transparent war chest for raid supplies, tournament entry fees, and community rewards.",
  },
  {
    symbol: "NVLT",
    name: "Nova Legion",
    game: "Sci-fi Shooter",
    targetPool: 500,
    suggestedDeposit: 2,
    members: 120,
    description:
      "A large esports-style clan collecting sponsor and member deposits for future prize pools and ranked team operations.",
  },
  {
    symbol: "PHNX",
    name: "Phoenix Guild",
    game: "Strategy Arena",
    targetPool: 150,
    suggestedDeposit: 1.5,
    members: 32,
    description:
      "A smaller strategy guild that wants a simple and auditable treasury for seasonal events and inter-clan challenges.",
  },
];

function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function readConnectionStatus(result: FreighterConnectionResponse) {
  if (typeof result === "boolean") return result;
  return Boolean(result.isConnected);
}

function readAddress(result: FreighterAddressResponse) {
  if (typeof result === "string") return result;
  return result.address ?? "";
}

function readSignedXdr(result: FreighterSignResponse) {
  if (typeof result === "string") return result;
  return result.signedTxXdr ?? "";
}

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [selectedClan, setSelectedClan] = useState(clans[0].symbol);
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [amount, setAmount] = useState(clans[0].suggestedDeposit.toString());
  const [memo, setMemo] = useState("clan_treasury");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState(
    "Connect your Freighter wallet to deposit into a clan treasury."
  );
  const [activity, setActivity] = useState<string[]>([
    "clan_treasury loaded on Stellar Testnet.",
  ]);

  const activeClan = useMemo(() => {
    return clans.find((clan) => clan.symbol === selectedClan) ?? clans[0];
  }, [selectedClan]);

  const txLink = txHash ? `${EXPLORER_TX_URL}${txHash}` : "";

  function addActivity(item: string) {
    setActivity((current) => [item, ...current].slice(0, 7));
  }

  function selectClan(clan: Clan) {
    setSelectedClan(clan.symbol);
    setAmount(clan.suggestedDeposit.toString());
    setMemo(`clan_${clan.symbol}_deposit`.slice(0, 28));
    addActivity(`Selected clan treasury: ${clan.symbol}.`);
  }

  async function getWalletAddressWithFallback() {
    console.log("Connect button clicked.");

    try {
      const requestResult = (await requestAccess()) as FreighterAddressResponse;
      const requestedAddress = readAddress(requestResult);

      if (requestedAddress) {
        console.log("Address from requestAccess:", requestedAddress);
        return requestedAddress;
      }
    } catch (error) {
      console.warn("requestAccess failed, trying setAllowed + getAddress.", error);
    }

    await setAllowed();

    const addressResult = (await getAddress()) as FreighterAddressResponse;
    const walletAddress = readAddress(addressResult);

    if (walletAddress) {
      console.log("Address from getAddress:", walletAddress);
      return walletAddress;
    }

    return "";
  }

  async function connectWallet() {
    try {
      setTxHash("");
      setTxStatus("idle");
      setMessage("Opening Freighter connection request...");
      addActivity("Connect button clicked. Waiting for Freighter.");

      try {
        const connectedResult = (await isConnected()) as FreighterConnectionResponse;
        const hasFreighter = readConnectionStatus(connectedResult);

        if (!hasFreighter) {
          addActivity("Freighter extension may not be detected yet.");
        }
      } catch {
        addActivity("Freighter connection check skipped.");
      }

      const walletAddress = await getWalletAddressWithFallback();

      if (!walletAddress) {
        setTxStatus("failed");
        setMessage(
          "Could not read wallet address. Unlock Freighter, switch to Testnet, then click Connect again."
        );
        addActivity("Wallet connection failed: address unavailable.");
        return;
      }

      setPublicKey(walletAddress);
      setMessage("Wallet connected successfully.");
      addActivity(`Connected player wallet ${shortAddress(walletAddress)}.`);
      await fetchBalance(walletAddress);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setTxStatus("failed");
      setMessage(
        "Wallet connection failed or was rejected. Unlock Freighter, allow this local app, switch to Testnet, then try again."
      );
      addActivity("Wallet connection failed or was rejected.");
    }
  }

  function disconnectWallet() {
    setPublicKey("");
    setBalance("0.00");
    setTxStatus("idle");
    setTxHash("");
    setMessage("Wallet disconnected from the app UI.");
    addActivity("Wallet disconnected from the app UI.");
  }

  async function fetchBalance(address = publicKey) {
    try {
      if (!address) {
        setMessage("Connect wallet first before refreshing balance.");
        return;
      }

      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find(
        (item) => item.asset_type === "native"
      );

      const readableBalance = nativeBalance
        ? Number(nativeBalance.balance).toFixed(2)
        : "0.00";

      setBalance(readableBalance);
      setMessage("Balance refreshed from Stellar Testnet.");
      addActivity(`Balance refreshed: ${readableBalance} XLM.`);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setMessage(
        "Could not fetch balance. Make sure your Freighter account is funded on Stellar Testnet."
      );
      addActivity("Balance fetch failed.");
    }
  }

  async function depositToClanTreasury() {
    try {
      setTxHash("");
      setTxStatus("pending");
      setMessage("Preparing clan treasury deposit transaction...");

      if (!publicKey) {
        setTxStatus("failed");
        setMessage("Please connect your Freighter wallet first.");
        addActivity("Treasury deposit failed: wallet not connected.");
        return;
      }

      if (!treasuryAddress || !treasuryAddress.startsWith("G")) {
        setTxStatus("failed");
        setMessage(
          "Please enter a valid Stellar Testnet treasury address starting with G."
        );
        addActivity("Treasury deposit failed: invalid treasury address.");
        return;
      }

      const numericAmount = Number(amount);

      if (!numericAmount || numericAmount <= 0) {
        setTxStatus("failed");
        setMessage("Please enter a valid XLM amount greater than 0.");
        addActivity("Treasury deposit failed: invalid amount.");
        return;
      }

      if (numericAmount > Number(balance)) {
        setTxStatus("failed");
        setMessage("Insufficient XLM balance for this clan treasury deposit.");
        addActivity("Treasury deposit failed: insufficient balance.");
        return;
      }

      setMessage("Loading player account from Stellar Testnet...");
      const sourceAccount = await server.loadAccount(publicKey);

      const safeMemo = memo.trim()
        ? memo.trim().replace(/\s+/g, "_").slice(0, 28)
        : "clan_treasury";

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: treasuryAddress,
            asset: StellarSdk.Asset.native(),
            amount: numericAmount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text(safeMemo))
        .setTimeout(180)
        .build();

      setMessage("Please approve the clan deposit in Freighter...");

      const signedResult = (await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })) as FreighterSignResponse;

      const signedXdr = readSignedXdr(signedResult);

      if (!signedXdr) {
        setTxStatus("failed");
        setMessage("Freighter did not return a signed transaction.");
        addActivity("Treasury deposit failed: missing signed transaction XDR.");
        return;
      }

      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        StellarSdk.Networks.TESTNET
      );

      setMessage("Submitting clan treasury deposit to Stellar Testnet...");
      addActivity("Clan treasury deposit signed by Freighter.");

      const submittedTx = await server.submitTransaction(signedTransaction);

      setTxHash(submittedTx.hash);
      setTxStatus("success");
      setMessage(
        "Clan treasury deposit sent successfully. Transaction hash is visible below."
      );
      addActivity(
        `Success: ${numericAmount} XLM deposited into ${activeClan.symbol}.`
      );

      await fetchBalance(publicKey);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setMessage(
        "Transaction failed or was rejected. Check Freighter Testnet mode, balance, treasury address, and amount."
      );
      addActivity("Clan treasury deposit failed or was rejected.");
    }
  }

  return (
    <main className="app">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Level 1 dApp</p>
          <h1>clan_treasury</h1>
        </div>

        <div className="wallet-actions">
          {publicKey ? (
            <>
              <button className="ghost-button" onClick={() => fetchBalance()}>
                Refresh Balance
              </button>
              <button className="danger-button" onClick={disconnectWallet}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={connectWallet}>
              Connect Freighter
            </button>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Gaming treasury on Stellar Testnet</p>
          <h2>Deposit into a clan war chest with a signed XLM payment.</h2>
          <p>
            This Level 1 version proves the core Stellar flow: Freighter wallet
            connection, XLM balance display, payment signing, transaction status,
            and a verifiable Stellar Expert transaction link.
          </p>
        </div>

        <div className="hero-card">
          <span>Network</span>
          <strong>Stellar Testnet</strong>
          <small>Transparent clan deposits</small>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Selected Clan</span>
          <strong>{activeClan.symbol}</strong>
        </div>
        <div className="stat-card">
          <span>Game</span>
          <strong>{activeClan.game}</strong>
        </div>
        <div className="stat-card">
          <span>Members</span>
          <strong>{activeClan.members}</strong>
        </div>
        <div className="stat-card">
          <span>Target Pool</span>
          <strong>{activeClan.targetPool} XLM</strong>
        </div>
      </section>

      <section className="grid">
        <div className="panel wallet-panel">
          <div className="panel-header">
            <p className="eyebrow">Player Wallet</p>
            <h3>Connected Account</h3>
          </div>

          {publicKey ? (
            <>
              <div className="address-box">{publicKey}</div>
              <div className="metric-row">
                <div>
                  <span>XLM Balance</span>
                  <strong>{balance}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Connected</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Connect Freighter to show your player wallet address and XLM balance.
            </div>
          )}
        </div>

        <div className="panel clan-panel">
          <div className="panel-header">
            <p className="eyebrow">Clan Registry</p>
            <h3>Choose Treasury</h3>
          </div>

          <div className="clan-list">
            {clans.map((clan) => (
              <button
                key={clan.symbol}
                className={
                  clan.symbol === selectedClan
                    ? "clan-button active"
                    : "clan-button"
                }
                onClick={() => selectClan(clan)}
              >
                <strong>
                  {clan.symbol} · {clan.name}
                </strong>
                <span>{clan.game}</span>
                <small>
                  {clan.members} members · target {clan.targetPool} XLM · suggested {clan.suggestedDeposit} XLM
                </small>
              </button>
            ))}
          </div>

          <div className="clan-detail">
            <span>{activeClan.description}</span>
          </div>
        </div>

        <div className="panel payment-panel">
          <div className="panel-header">
            <p className="eyebrow">Treasury Deposit</p>
            <h3>Send Testnet XLM</h3>
          </div>

          <label>
            Treasury / Admin Address
            <input
              value={treasuryAddress}
              onChange={(event) => setTreasuryAddress(event.target.value)}
              placeholder="Paste funded Testnet treasury G... address"
            />
          </label>

          <label>
            Deposit Amount in XLM
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="1"
              type="number"
              min="0"
              step="0.1"
            />
          </label>

          <label>
            Memo
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              maxLength={28}
              placeholder="clan_treasury"
            />
          </label>

          <button
            className="primary-button full-width"
            onClick={depositToClanTreasury}
            disabled={txStatus === "pending"}
          >
            {txStatus === "pending" ? "Depositing..." : "Deposit to Clan Treasury"}
          </button>

          <p className="hint">
            The treasury account must already exist and be funded on Stellar Testnet.
          </p>
        </div>

        <div className="panel status-panel">
          <div className="panel-header">
            <p className="eyebrow">Transaction Monitor</p>
            <h3>Status</h3>
          </div>

          <div className={`status-card ${txStatus}`}>
            <span>{txStatus.toUpperCase()}</span>
            <p>{message}</p>
          </div>

          {txHash && (
            <div className="tx-box">
              <span>Transaction Hash</span>
              <code>{txHash}</code>
              <a href={txLink} target="_blank" rel="noreferrer">
                View on Stellar Expert
              </a>
            </div>
          )}

          <div className="activity-feed">
            <h4>Clan Activity Feed</h4>
            {activity.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;