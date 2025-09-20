import type { DecodedTx, TxInput } from "../types.js";
import { getSelector } from "../utils.js";
import { decodeERC20 } from "./erc20.js";
import { decodeNFT } from "./erc721_1155.js";
import { decodeUniswap } from "./uniswap.js";

/**
 * Main decoder entry point - attempts to decode transaction data
 * using known function signatures. Returns null for unrecognized calls.
 */
export function decodeTx(tx: TxInput): DecodedTx {
  // Handle ETH transfers (no data or empty data with value)
  if ((!tx.data || tx.data === "0x") && tx.value && tx.value > 0n) {
    return {
      type: "eth_transfer",
      args: {
        to: tx.to,
        value: tx.value,
      },
      contractAddress: tx.to,
    };
  }

  // Try decoding with known ABIs
  let decoded: DecodedTx | null = null;

  // ERC20 tokens
  decoded = decodeERC20(tx);
  if (decoded) return decoded;

  // NFTs (ERC721/ERC1155)
  decoded = decodeNFT(tx);
  if (decoded) return decoded;

  // Uniswap swaps
  decoded = decodeUniswap(tx);
  if (decoded) return decoded;

  // Unknown function call
  const selector = getSelector(tx.data);
  return {
    type: "unknown",
    selector: selector ?? "0x00000000",
    args: {
      data: tx.data,
    },
    contractAddress: tx.to,
  };
}

export { decodeERC20, decodeNFT, decodeUniswap };
