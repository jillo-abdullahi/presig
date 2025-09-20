import { decodeFunctionData, parseAbi } from "viem";
import type { DecodedTx, TxInput } from "../types.js";
import { getSelector } from "../utils.js";

// Minimal Uniswap V2/V3 function signatures for basic swap detection
const UNISWAP_ABI = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96))",
]);

// Known Uniswap selectors (subset for basic detection)
const SELECTORS = {
  swapExactTokensForTokens: "0x38ed1739",
  swapTokensForExactTokens: "0x8803dbee",
  swapExactETHForTokens: "0x7ff36ab5",
  swapTokensForExactETH: "0x4a25d94a",
  exactInputSingle: "0x414bf389", // V3 single swap
} as const;

export function decodeUniswap(tx: TxInput): DecodedTx | null {
  if (!tx.data || tx.data.length < 10) return null;
  
  const selector = getSelector(tx.data);
  if (!selector) return null;

  try {
    switch (selector) {
      case SELECTORS.swapExactTokensForTokens: {
        const decoded = decodeFunctionData({
          abi: UNISWAP_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "swapExactTokensForTokens") {
          return {
            type: "uniswap_swap",
            selector,
            args: {
              amountIn: decoded.args[0],
              amountOutMin: decoded.args[1],
              path: decoded.args[2],
              to: decoded.args[3],
              deadline: decoded.args[4],
              swapType: "exactTokensForTokens",
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.swapTokensForExactTokens: {
        const decoded = decodeFunctionData({
          abi: UNISWAP_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "swapTokensForExactTokens") {
          return {
            type: "uniswap_swap",
            selector,
            args: {
              amountOut: decoded.args[0],
              amountInMax: decoded.args[1],
              path: decoded.args[2],
              to: decoded.args[3],
              deadline: decoded.args[4],
              swapType: "tokensForExactTokens",
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      case SELECTORS.exactInputSingle: {
        const decoded = decodeFunctionData({
          abi: UNISWAP_ABI,
          data: tx.data,
        });
        
        if (decoded.functionName === "exactInputSingle") {
          const params = decoded.args[0] as {
            tokenIn: string;
            tokenOut: string;
            fee: number;
            recipient: string;
            deadline: bigint;
            amountIn: bigint;
            amountOutMinimum: bigint;
            sqrtPriceLimitX96: bigint;
          };
          
          return {
            type: "uniswap_swap",
            selector,
            args: {
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              amountIn: params.amountIn,
              amountOutMinimum: params.amountOutMinimum,
              recipient: params.recipient,
              deadline: params.deadline,
              swapType: "exactInputSingle",
            },
            contractAddress: tx.to,
          };
        }
        break;
      }

      // Add ETH swap cases if needed
      case SELECTORS.swapExactETHForTokens:
      case SELECTORS.swapTokensForExactETH: {
        // Basic ETH swap detection - implementation can be expanded
        return {
          type: "uniswap_swap",
          selector,
          args: {
            swapType: selector === SELECTORS.swapExactETHForTokens ? "exactETHForTokens" : "tokensForExactETH",
          },
          contractAddress: tx.to,
        };
      }
    }
  } catch (error) {
    // Decode failed - not a recognized Uniswap call
    return null;
  }

  return null;
}
