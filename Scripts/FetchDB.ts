import mongoose from "mongoose";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

// MongoDB Connection
const MONGO_URI = "mongodb://localhost:27017/pumpfun";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define Transaction Schema
const TransactionSchema = new mongoose.Schema({
  signature: String,
  slot: String,
  mint: String,
});
const TransactionModel = mongoose.model("Transaction", TransactionSchema);

// Define Mint Metadata Schema
const MintMetadataSchema = new mongoose.Schema({
  mint: { type: String, unique: true },
  name: String,
  symbol: String,
  uri: String,
  sellerFeeBasisPoints: Number,
  creators: [
    {
      address: String,
      share: Number,
      verified: Boolean,
    },
  ],
  lastUpdated: { type: Date, default: Date.now },
});
const MintMetadataModel = mongoose.model("MintMetadata", MintMetadataSchema);

// Interface for token details
interface MintDetails {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators?: {
    address: string;
    share: number;
    verified: boolean;
  }[];
}

// Initialize Solana connection and Metaplex
const connection = new Connection(clusterApiUrl("mainnet-beta"));
const metaplex = new Metaplex(connection);

// Function to get mint details directly from Solana
async function getMintDetails(
  mintAddress: string
): Promise<MintDetails | null> {
  try {
    const mintPublicKey = new PublicKey(mintAddress);

    // Fetch NFT metadata
    const nft = await metaplex
      .nfts()
      .findByMint({ mintAddress: mintPublicKey });

    if (!nft) {
      console.log(`⚠️ No metadata found for ${mintAddress}`);
      return null;
    }

    // Map the metadata to our schema
    const mintDetails: MintDetails = {
      mint: mintAddress,
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
      creators: nft.creators?.map((creator) => ({
        address: creator.address.toString(),
        share: creator.share,
        verified: creator.verified,
      })),
    };

    return mintDetails;
  } catch (error) {
    console.error(
      `❌ Error fetching mint details for ${mintAddress}:`,
      (error as Error).message
    );
    return null;
  }
}

// Function to process all transactions
async function processTransactions() {
  try {
    const transactions = await TransactionModel.find({}, "mint");
    const mintAddresses = transactions.map((tx) => tx.mint);

    for (const mint of mintAddresses) {
      const existing = await MintMetadataModel.findOne({ mint });
      if (existing) {
        console.log(`⏭ Skipping ${mint}, already stored.`);
        continue;
      }

      if (mint) {
        const mintDetails = await getMintDetails(mint);
        if (mintDetails) {
          await MintMetadataModel.create(mintDetails);
          console.log(`✅ Stored metadata for ${mint}`);
        }
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error("❌ Error processing transactions:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
processTransactions();
