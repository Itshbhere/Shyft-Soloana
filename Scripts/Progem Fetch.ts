import Client, {
  CommitmentLevel,
  SubscribeRequestAccountsDataSlice,
  SubscribeRequestFilterAccounts,
  SubscribeRequestFilterBlocks,
  SubscribeRequestFilterBlocksMeta,
  SubscribeRequestFilterEntry,
  SubscribeRequestFilterSlots,
  SubscribeRequestFilterTransactions,
} from "@triton-one/yellowstone-grpc";
import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/grpc/geyser";
import { PublicKey } from "@solana/web3.js";
import colors from "colors";

// Configure colors theme
colors.setTheme({
  debug: "blue",
  error: "red",
  warn: "yellow",
  info: "cyan",
  success: "green",
});

// Configuration constants
const CONFIG = {
  ENDPOINT: "https://grpc.ny.shyft.to",
  API_KEY: "WelcomeToShyft",
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 5,
  DEBUG: true,
} as const;

// Program IDs with human-readable names
const PROGRAM_IDS = {
  TOKEN: {
    address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    name: "Token Program",
  },
  TOKEN_METADATA: {
    address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    name: "Token Metadata Program",
  },
} as const;

interface SubscribeRequest {
  accounts: { [key: string]: SubscribeRequestFilterAccounts };
  slots: { [key: string]: SubscribeRequestFilterSlots };
  transactions: { [key: string]: SubscribeRequestFilterTransactions };
  transactionsStatus: { [key: string]: SubscribeRequestFilterTransactions };
  blocks: { [key: string]: SubscribeRequestFilterBlocks };
  blocksMeta: { [key: string]: SubscribeRequestFilterBlocksMeta };
  entry: { [key: string]: SubscribeRequestFilterEntry };
  commitment?: CommitmentLevel;
  accountsDataSlice: SubscribeRequestAccountsDataSlice[];
  ping?: SubscribeRequestPing;
}

interface TransactionInfo {
  signature: string | null;
  timestamp: string;
  accounts: string[];
  programIds: string[];
}

class TokenTransactionMonitor {
  private client: Client;
  private retryCount: number = 0;
  private transactionCount: number = 0;

  constructor(endpoint: string, apiKey: string) {
    this.client = new Client(endpoint, apiKey, undefined);
  }

  private debugLog(message: string, data?: any) {
    if (CONFIG.DEBUG) {
      console.log(colors.blue(`[DEBUG] ${message}`));
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      month: "short",
      day: "numeric",
    });
  }

  private formatAddress(address: string, length: number = 4): string {
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  private getProgramName(address: string): string {
    for (const [key, value] of Object.entries(PROGRAM_IDS)) {
      if (value.address === address) {
        return value.name;
      }
    }
    return "Unknown Program";
  }

  private async handleStream(args: SubscribeRequest): Promise<void> {
    const stream = await this.client.subscribe();

    const streamClosed = new Promise<void>((resolve, reject) => {
      stream.on("error", (error) => {
        console.error(colors.red("Stream error:"), error);
        reject(error);
        stream.end();
      });
      stream.on("end", () => {
        console.log(colors.yellow("Stream ended"));
        resolve();
      });
      stream.on("close", () => {
        console.log(colors.yellow("Stream closed"));
        resolve();
      });
    });

    stream.on("data", async (data) => {
      try {
        if (data.transaction) {
          this.debugLog("Received transaction data:", data.transaction);
          const txInfo = this.extractTransactionInfo(data.transaction);
          if (this.isTokenTransaction(txInfo)) {
            this.logTokenTransaction(txInfo);
          }
        } else {
          this.debugLog("Received non-transaction data:", data);
        }
      } catch (error) {
        console.error(colors.red("Error processing transaction:"), error);
        this.debugLog("Problem transaction data:", data);
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.write(args, (err: any) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    });

    await streamClosed;
  }

  private extractTransactionInfo(tx: any): TransactionInfo {
    this.debugLog("Extracting transaction info from:", tx);

    let signature: string | null = null;
    let accounts: string[] = [];
    let programIds: string[] = [];

    try {
      // Extract signature
      if (
        tx.transaction?.signatures &&
        Array.isArray(tx.transaction.signatures)
      ) {
        signature = tx.transaction.signatures[0] || null;
      }

      // Extract accounts
      if (
        tx.transaction?.message?.accountKeys &&
        Array.isArray(tx.transaction.message.accountKeys)
      ) {
        accounts = tx.transaction.message.accountKeys;
      }

      // Extract program IDs
      programIds = [...accounts];
    } catch (error) {
      console.error(colors.red("Error extracting transaction info:"), error);
      this.debugLog("Problem transaction:", tx);
    }

    return {
      signature,
      timestamp: new Date().toISOString(),
      accounts,
      programIds,
    };
  }

  private isTokenTransaction(txInfo: TransactionInfo): boolean {
    return txInfo.accounts.some(
      (account) =>
        account === PROGRAM_IDS.TOKEN.address ||
        account === PROGRAM_IDS.TOKEN_METADATA.address
    );
  }

  private logTokenTransaction(txInfo: TransactionInfo): void {
    this.transactionCount++;
    const timestamp = this.formatTimestamp(txInfo.timestamp);

    // Create a clean, readable output
    console.log("\n" + colors.cyan("━".repeat(80)));
    console.log(
      colors.white.bold(`Token Transaction Details #${this.transactionCount}`)
    );
    console.log(colors.cyan("━".repeat(80)));

    // Transaction basics
    console.log(colors.white.bold("🕒 Time:      "), colors.white(timestamp));
    console.log(
      colors.white.bold("🔑 Signature:  "),
      colors.yellow(
        txInfo.signature ? this.formatAddress(txInfo.signature, 6) : "N/A"
      )
    );

    // Programs involved
    const uniquePrograms = [...new Set(txInfo.programIds)];
    console.log(colors.white.bold("\n📦 Programs Involved:"));
    uniquePrograms
      .filter((program) =>
        [
          PROGRAM_IDS.TOKEN.address,
          PROGRAM_IDS.TOKEN_METADATA.address,
        ].includes(
          program as
            | "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            | "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        )
      )
      .forEach((program) => {
        const programName = this.getProgramName(program);
        console.log(colors.green(`   • ${programName}`));
        console.log(colors.dim(`     ${this.formatAddress(program, 6)}`));
      });

    // Accounts involved
    const nonProgramAccounts = txInfo.accounts.filter(
      (account) =>
        ![
          PROGRAM_IDS.TOKEN.address,
          PROGRAM_IDS.TOKEN_METADATA.address,
        ].includes(
          account as
            | "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            | "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        )
    );

    if (nonProgramAccounts.length > 0) {
      console.log(colors.white.bold("\n👤 Wallet Accounts:"));
      nonProgramAccounts.forEach((account, index) => {
        console.log(
          colors.blue(
            `   • Account ${index + 1}: ${this.formatAddress(account, 6)}`
          )
        );
      });
    }

    console.log(colors.cyan("━".repeat(80)) + "\n");
  }

  public async start(args: SubscribeRequest): Promise<never> {
    // Startup message
    console.log(colors.cyan("━".repeat(80)));
    console.log(colors.white.bold("🔍 Token Transaction Monitor"));
    console.log(colors.cyan("━".repeat(80)));
    console.log(
      colors.white.bold("📡 Endpoint:    "),
      colors.dim(CONFIG.ENDPOINT)
    );
    console.log(
      colors.white.bold("🐛 Debug Mode:  "),
      CONFIG.DEBUG ? colors.green("Enabled") : colors.yellow("Disabled")
    );
    console.log(colors.cyan("━".repeat(80)) + "\n");

    while (true) {
      try {
        this.retryCount = 0;
        await this.handleStream(args);
      } catch (error) {
        this.retryCount++;
        const delay = Math.min(
          CONFIG.RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1),
          30000
        );

        console.error(
          colors.red(
            `⚠️ Stream error (attempt ${this.retryCount}/${CONFIG.MAX_RETRIES}), ` +
              `retrying in ${delay}ms...`
          ),
          error
        );

        if (this.retryCount >= CONFIG.MAX_RETRIES) {
          console.error(colors.red("❌ Max retries reached, exiting..."));
          process.exit(1);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

// Initialize and start monitoring
const monitor = new TokenTransactionMonitor(CONFIG.ENDPOINT, CONFIG.API_KEY);

const subscribeRequest: SubscribeRequest = {
  slots: {},
  accounts: {},
  transactions: {
    default: {
      accountInclude: [
        PROGRAM_IDS.TOKEN
          .address as "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        PROGRAM_IDS.TOKEN_METADATA
          .address as "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
      ],
      accountExclude: [],
      accountRequired: [],
    } as SubscribeRequestFilterTransactions,
  },
  transactionsStatus: {},
  blocks: {},
  blocksMeta: {},
  entry: {},
  accountsDataSlice: [],
  commitment: CommitmentLevel.CONFIRMED,
};

monitor.start(subscribeRequest).catch((error) => {
  console.error(colors.red("❌ Fatal error:"), error);
  process.exit(1);
});
