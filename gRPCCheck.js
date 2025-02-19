import dotenv from "dotenv";
dotenv.config();
import Client from "@triton-one/yellowstone-grpc";
import { CommitmentLevel } from "@triton-one/yellowstone-grpc";

// Load environment variables
const SHYFT_GRPC_URL = process.env.gRPC_URL;
const SHYFT_API_TOKEN = process.env.gRPC_TOKEN;

console.log(SHYFT_GRPC_URL);

if (!SHYFT_GRPC_URL || !SHYFT_API_TOKEN) {
  console.error("Missing SHYFT_GRPC_URL or SHYFT_API_TOKEN in .env file");
  process.exit(1);
}
// Create gRPC client
const client = new Client(SHYFT_GRPC_URL, SHYFT_API_TOKEN, undefined);
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
const stream = client.Subscribe(request);

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
