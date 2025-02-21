import { mongoose } from "mongoose";
import { axios } from "axios";

// MongoDB Connection
const MONGO_URI = "mongodb://localhost:27017/pumpfun"; // Update if needed
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
  price: Number,
  isFreezable: Boolean,
  lastUpdated: { type: Date, default: Date.now },
});
const MintMetadataModel = mongoose.model("MintMetadata", MintMetadataSchema);

// Function to get mint details from Solscan API
async function getMintDetails(mintAddress) {
  try {
    const response = await axios.get(
      `https://pro-api.solscan.io/v1/token/meta?tokenAddress=${mintAddress}`,
      {
        headers: {
          token: "YOUR_SOLSCAN_API_KEY", // Replace with your API key
        },
      }
    );

    const data = response.data?.data;
    if (!data) throw new Error("Invalid response from Solscan");

    return {
      mint: mintAddress,
      name: data.name || "Unknown",
      price: data.priceUsdt || 0,
      isFreezable: data.freezeAuthority ? true : false,
    };
  } catch (error) {
    console.error(`Error fetching mint details for ${mintAddress}:`, error);
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
        console.log(`Skipping ${mint}, already stored.`);
        continue;
      }

      const mintDetails = await getMintDetails(mint);
      if (mintDetails) {
        await MintMetadataModel.create(mintDetails);
        console.log(`✅ Stored metadata for ${mint}`);
      }
    }
  } catch (error) {
    console.error("Error processing transactions:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
processTransactions();
