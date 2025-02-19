// gRPCCheck.js
const dotenv = require("dotenv");
const { CommitmentLevel } = require("@triton-one/yellowstone-grpc");
const { Client } = require("@triton-one/yellowstone-grpc");
// Load environment variables
dotenv.config();

const SHYFT_GRPC_URL = process.env.gRPC_URL;
const SHYFT_API_TOKEN = process.env.gRPC_TOKEN;
const channelOptions = {
  "grpc.keepalive_time_ms": 10000,
};

if (!SHYFT_GRPC_URL || !SHYFT_API_TOKEN) {
  console.error("Missing SHYFT_GRPC_URL or SHYFT_API_TOKEN in .env file");
  process.exit(1);
}

const main = async () => {
  try {
    // Create gRPC client
    const client = new Client({
      endpoint: SHYFT_GRPC_URL,
      token: SHYFT_API_TOKEN,
      channelOptions,
    });

    // Define the subscription request for blocks
    const request = {
      blocks: {
        accountInclude: [], // Subscribe to all blocks
        includeTransactions: true, // Include transactions in block data
        includeAccounts: true, // Include accounts interacting in the block
        includeEntries: false, // Exclude transaction entries
      },
      commitment: CommitmentLevel.FINALIZED, // Options: PROCESSED, CONFIRMED, FINALIZED
    };

    // Establish the stream
    const stream = client.subscribe(request);

    stream.on("data", (block) => {
      console.log("\n🔹 New Block Detected!");
      console.log(`  ➤ Block Slot: ${block.slot}`);
      console.log(`  ➤ Block Hash: ${block.blockhash}`);
      console.log(`  ➤ Parent Hash: ${block.previousBlockhash}`);
      // Add more processing logic as needed
    });

    stream.on("error", (err) => {
      console.error("🚨 gRPC Error:", err.message);
    });

    stream.on("end", () => {
      console.log("🔄 Stream ended.");
    });
  } catch (error) {
    console.error("Failed to initialize client:", error);
    process.exit(1);
  }
};

main().catch(console.error);
