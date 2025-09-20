import { parseAbi } from "viem";
import type { ViemClient, TokenMeta, EnrichmentData, DecodedTx } from "../types.js";

// ERC20 ABI for reading token metadata
const ERC20_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

/**
 * Fetch token metadata (symbol, decimals, name) from contract
 */
export async function getTokenMeta(
  tokenAddress: `0x${string}`,
  client: ViemClient
): Promise<TokenMeta> {
  try {
    // Fetch token metadata in parallel
    const [symbol, decimals, name] = await Promise.allSettled([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "symbol",
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "name",
      }),
    ]);

    return {
      symbol: symbol.status === "fulfilled" ? (symbol.value as string) : "UNKNOWN",
      decimals: decimals.status === "fulfilled" ? Number(decimals.value) : 18,
      name: name.status === "fulfilled" ? (name.value as string) : undefined,
    };
  } catch {
    return {
      symbol: "UNKNOWN", 
      decimals: 18,
    };
  }
}

/**
 * Get current allowance for owner/spender pair
 */
export async function getAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  client: ViemClient
): Promise<bigint | undefined> {
  try {
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
    return allowance as bigint;
  } catch {
    return undefined;
  }
}

/**
 * Check if address is a contract (has bytecode)
 */
export async function isContract(
  address: `0x${string}`,
  client: ViemClient
): Promise<boolean> {
  try {
    const bytecode = await client.getCode({ address });
    return bytecode !== undefined && bytecode !== "0x";
  } catch {
    return false;
  }
}

/**
 * Enrich decoded transaction with on-chain data
 */
export async function enrichTx(
  decoded: DecodedTx,
  client: ViemClient,
  fromAddress?: `0x${string}`
): Promise<EnrichmentData> {
  const enrichment: EnrichmentData = {
    tokenMeta: {},
    allowances: {},
    contractFlags: {},
  };

  try {
    // Collect addresses to check
    const tokenAddresses = new Set<`0x${string}`>();
    const contractAddresses = new Set<`0x${string}`>();
    const allowanceQueries: Array<{
      token: `0x${string}`;
      owner: `0x${string}`;
      spender: `0x${string}`;
      key: string;
    }> = [];

    // Extract relevant addresses based on transaction type
    switch (decoded.type) {
      case "erc20_approve":
      case "erc20_transfer":
      case "erc20_transferFrom":
      case "erc20_permit": {
        tokenAddresses.add(decoded.contractAddress);
        
        if (decoded.type === "erc20_approve" && fromAddress) {
          allowanceQueries.push({
            token: decoded.contractAddress,
            owner: fromAddress,
            spender: decoded.args.spender as `0x${string}`,
            key: `${decoded.contractAddress}-${fromAddress}-${decoded.args.spender}`,
          });
          contractAddresses.add(decoded.args.spender as `0x${string}`);
        }
        
        if (decoded.type === "erc20_transfer") {
          contractAddresses.add(decoded.args.to as `0x${string}`);
        }
        break;
      }

      case "erc721_setApprovalForAll":
      case "erc1155_setApprovalForAll": {
        contractAddresses.add(decoded.args.operator as `0x${string}`);
        break;
      }

      case "uniswap_swap": {
        // Add token addresses from swap path if available
        if (decoded.args.path && Array.isArray(decoded.args.path)) {
          for (const token of decoded.args.path) {
            tokenAddresses.add(token as `0x${string}`);
          }
        }
        if (decoded.args.tokenIn) {
          tokenAddresses.add(decoded.args.tokenIn as `0x${string}`);
        }
        if (decoded.args.tokenOut) {
          tokenAddresses.add(decoded.args.tokenOut as `0x${string}`);
        }
        break;
      }

      case "eth_transfer": {
        contractAddresses.add(decoded.args.to as `0x${string}`);
        break;
      }
    }

    // Fetch all data in parallel
    const promises: Promise<unknown>[] = [];

    // Token metadata
    for (const tokenAddr of tokenAddresses) {
      promises.push(
        getTokenMeta(tokenAddr, client).then((meta) => {
          enrichment.tokenMeta![tokenAddr] = meta;
        }).catch(() => {
          // Ignore individual failures
        })
      );
    }

    // Contract checks
    for (const contractAddr of contractAddresses) {
      promises.push(
        isContract(contractAddr, client).then((isContractResult) => {
          enrichment.contractFlags![contractAddr] = isContractResult;
        }).catch(() => {
          // Ignore individual failures
        })
      );
    }

    // Allowance queries
    for (const query of allowanceQueries) {
      promises.push(
        getAllowance(query.token, query.owner, query.spender, client).then((allowance) => {
          if (allowance !== undefined) {
            enrichment.allowances![query.key] = allowance;
          }
        }).catch(() => {
          // Ignore individual failures
        })
      );
    }

    await Promise.allSettled(promises);
  } catch {
    // Return partial enrichment on error
  }

  return enrichment;
}
