import { decodeFunctionData, parseAbi } from "viem";
import type { DecodedTx, TxInput } from "../types.js";
import { getSelector } from "../utils.js";

// ERC721/ERC1155 function signatures
const NFT_ABI = parseAbi([
  "function setApprovalForAll(address operator, bool approved)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
]);

// Known NFT selectors
const SELECTORS = {
  setApprovalForAll: "0xa22cb465",
  erc721SafeTransferFrom: "0x42842e0e", // safeTransferFrom(address,address,uint256)
  erc721SafeTransferFromWithData: "0xb88d4fde", // safeTransferFrom(address,address,uint256,bytes)
  erc1155SafeTransferFrom: "0xf242432a", // safeTransferFrom(address,address,uint256,uint256,bytes)
} as const;

export function decodeNFT(tx: TxInput): DecodedTx | null {
  if (!tx.data || tx.data.length < 10) return null;
  
  const selector = getSelector(tx.data);
  if (!selector) return null;

  try {
    switch (selector) {
      case SELECTORS.setApprovalForAll: {
        const decoded = decodeFunctionData({
          abi: NFT_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "setApprovalForAll") {
          // Determine if this is ERC721 or ERC1155 based on context
          // For now, we'll default to ERC721 and let enrichment refine
          return {
            type: "erc721_setApprovalForAll",
            selector,
            args: {
              operator: decoded.args[0],
              approved: decoded.args[1],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.erc721SafeTransferFrom:
      case SELECTORS.erc721SafeTransferFromWithData: {
        const decoded = decodeFunctionData({
          abi: NFT_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "safeTransferFrom") {
          return {
            type: "erc721_safeTransferFrom",
            selector,
            args: {
              from: decoded.args[0],
              to: decoded.args[1],
              tokenId: decoded.args[2],
              data: decoded.args[3] || "0x",
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.erc1155SafeTransferFrom: {
        const decoded = decodeFunctionData({
          abi: NFT_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "safeTransferFrom") {
          return {
            type: "erc1155_safeTransferFrom",
            selector,
            args: {
              from: decoded.args[0],
              to: decoded.args[1],
              id: decoded.args[2],
              amount: decoded.args[3],
              data: decoded.args[4],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }
    }
  } catch (error) {
    // Decode failed - not an NFT call or malformed data
    return null;
  }

  return null;
}
