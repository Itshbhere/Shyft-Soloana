import { ShyftSdk, Network } from "@shyft-to/js";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.MY_API;

const shyft = new ShyftSdk({ apiKey: key, network: Network.Devnet });
(async () => {
  const token = await shyft.token.getInfo({
    network: Network.Devnet,
    tokenAddress: "6TpnnQFFjbyruU4q96x1mygUUynQ9uRxSAWymuAK9FYz",
  });
  console.log(token);
})();
