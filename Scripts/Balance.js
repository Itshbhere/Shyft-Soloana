import dotenv from "dotenv";
import { ShyftSdk, Network } from "@shyft-to/js";

dotenv.config();

const key = process.env.MY_API;
if (!key) {
  console.error("API key is missing. Check your .env file.");
  process.exit(1);
}

console.log("API Key Loaded");

const shyft = new ShyftSdk({
  apiKey: key,
  network: Network.Devnet,
});

(async () => {
  try {
    const balance = await shyft.wallet.getBalance({
      wallet: "wHPN297UsAPwDsJDxKgCWCVTEWXBJ7divqnKW4fxKYj",
    });
    console.log("Balance:", balance);
  } catch (error) {
    console.error("rror fetching balance:", error);
  }
})();
