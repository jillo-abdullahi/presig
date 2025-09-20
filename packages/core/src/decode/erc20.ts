import { decodeFunctionData, parseAbi, type Hex } from "viem";
import type { DecodedTx, TxInput } from "../types.js";
import { getSelector } from "../utils.js";

// ERC20 function signatures
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
]);

// Known ERC20 selectors
const SELECTORS = {
  approve: "0x095ea7b3",
  transfer: "0xa9059cbb", 
  transferFrom: "0x23b872dd",
  permit: "0xd505accf",
} as const;

export function decodeERC20(tx: TxInput): DecodedTx | null {
  if (!tx.data || tx.data.length < 10) return null;
  
  const selector = getSelector(tx.data);
  if (!selector) return null;

  try {
    switch (selector) {
      case SELECTORS.approve: {
        const decoded = decodeFunctionData({
          abi: ERC20_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "approve") {
          return {
            type: "erc20_approve",
            selector,
            args: {
              spender: decoded.args[0],
              amount: decoded.args[1],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.transfer: {
        const decoded = decodeFunctionData({
          abi: ERC20_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "transfer") {
          return {
            type: "erc20_transfer",
            selector,
            args: {
              to: decoded.args[0],
              amount: decoded.args[1],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.transferFrom: {
        const decoded = decodeFunctionData({
          abi: ERC20_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "transferFrom") {
          return {
            type: "erc20_transferFrom",
            selector,
            args: {
              from: decoded.args[0],
              to: decoded.args[1],
              amount: decoded.args[2],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.permit: {
        const decoded = decodeFunctionData({
          abi: ERC20_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "permit") {
          return {
            type: "erc20_permit",
            selector,
            args: {
              owner: decoded.args[0],
              spender: decoded.args[1],
              value: decoded.args[2],
              deadline: decoded.args[3],
              v: decoded.args[4],
              r: decoded.args[5],
              s: decoded.args[6],
            },
            contractAddress: tx.to,
          };
        }
        break;
      }
    }
  } catch (error) {
    // Decode failed - not an ERC20 call or malformed data
    return null;
  }

  return null;
}
