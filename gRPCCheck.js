import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import dotenv from "dotenv";
dotenv.config();

// Load environment variables
const SHYFT_GRPC_URL = process.env.gRPC_Token;
const SHYFT_API_TOKEN = process.env.gRPC_Token;

if (!SHYFT_GRPC_URL || !SHYFT_API_TOKEN) {
  console.error("Missing SHYFT_GRPC_URL or SHYFT_API_TOKEN in .env file");
  process.exit(1);
}

// Load the Shyft protobuf definition
const PROTO_PATH = "./shyft.proto"; // Ensure you have the correct proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const shyftProto = grpc.loadPackageDefinition(packageDefinition).shyft.rpc;

// Create gRPC client
const client = new shyftProto.ShyftService(
  SHYFT_GRPC_URL,
  grpc.credentials.createSsl()
);

// Define the transaction subscription request
const request = {
  transactions: {
    accounts: [], // Track all transactions (specify account addresses to filter)
    includeAccounts: true,
    includeSignatures: true,
    includeRaw: false,
  },
  commitment: "confirmed", // Options: processed, confirmed, finalized
};

// Subscribe to transactions
const stream = client.Subscribe(request);

stream.on("data", (tx) => {
  console.log(`\n🔹 New Transaction Detected:`);
  console.log(`  ➤ Signature: ${tx.signature}`);
  console.log(`  ➤ Block: ${tx.slot}`);
  console.log(
    `  ➤ Accounts: ${tx.accounts.map((acc) => acc.pubkey).join(", ")}`
  );
});

stream.on("error", (err) => {
  console.error("🚨 gRPC Error:", err.message);
});

stream.on("end", () => {
  console.log("🔄 Stream ended.");
});
