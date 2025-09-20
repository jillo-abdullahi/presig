import type { DecodedTx, EnrichmentData, RiskLevel } from "../types.js";
import { formatAmount, shortenAddress, isUnlimited } from "../utils.js";

/**
 * Generate human-readable title and summary for decoded transaction
 */
export function generateExplanation(
  decoded: DecodedTx,
  enrichment: EnrichmentData,
  riskLevel: RiskLevel
): { title: string; summary: string } {
  
  switch (decoded.type) {
    case "erc20_approve": {
      const amount = decoded.args.amount as bigint;
      const spender = decoded.args.spender as `0x${string}`;
      const tokenMeta = enrichment.tokenMeta?.[decoded.contractAddress];
      
      const amountText = isUnlimited(amount) 
        ? "unlimited"
        : formatAmount(amount, tokenMeta?.decimals ?? 18);
      
      const symbol = tokenMeta?.symbol ?? "tokens";
      const spenderLabel = shortenAddress(spender);

      const title = `Approve ${amountText} ${symbol}`;
      
      let summary = `Grant permission to spend ${amountText} ${symbol} to ${spenderLabel}.`;
      
      if (riskLevel === "high" || riskLevel === "medium") {
        if (isUnlimited(amount)) {
          summary += " ⚠️ This is an unlimited approval - the spender can use all your tokens.";
        }
      }

      return { title, summary };
    }

    case "erc20_transfer": {
      const amount = decoded.args.amount as bigint;
      const to = decoded.args.to as `0x${string}`;
      const tokenMeta = enrichment.tokenMeta?.[decoded.contractAddress];
      
      const amountText = formatAmount(amount, tokenMeta?.decimals ?? 18);
      const symbol = tokenMeta?.symbol ?? "tokens";
      const toLabel = shortenAddress(to);

      const title = `Send ${amountText} ${symbol}`;
      const summary = `Transfer ${amountText} ${symbol} to ${toLabel}.`;

      return { title, summary };
    }

    case "erc20_transferFrom": {
      const amount = decoded.args.amount as bigint;
      const from = decoded.args.from as `0x${string}`;
      const to = decoded.args.to as `0x${string}`;
      const tokenMeta = enrichment.tokenMeta?.[decoded.contractAddress];
      
      const amountText = formatAmount(amount, tokenMeta?.decimals ?? 18);
      const symbol = tokenMeta?.symbol ?? "tokens";
      const fromLabel = shortenAddress(from);
      const toLabel = shortenAddress(to);

      const title = `Transfer ${amountText} ${symbol}`;
      const summary = `Transfer ${amountText} ${symbol} from ${fromLabel} to ${toLabel}.`;

      return { title, summary };
    }

    case "erc20_permit": {
      const value = decoded.args.value as bigint;
      const spender = decoded.args.spender as `0x${string}`;
      const tokenMeta = enrichment.tokenMeta?.[decoded.contractAddress];
      
      const amountText = isUnlimited(value) 
        ? "unlimited"
        : formatAmount(value, tokenMeta?.decimals ?? 18);
      
      const symbol = tokenMeta?.symbol ?? "tokens";
      const spenderLabel = shortenAddress(spender);

      const title = `Permit ${amountText} ${symbol}`;
      const summary = `Create off-chain approval for ${spenderLabel} to spend ${amountText} ${symbol}.`;

      return { title, summary };
    }

    case "erc721_setApprovalForAll":
    case "erc1155_setApprovalForAll": {
      const approved = decoded.args.approved as boolean;
      const operator = decoded.args.operator as `0x${string}`;
      const operatorLabel = shortenAddress(operator);
      const collectionLabel = shortenAddress(decoded.contractAddress);

      if (approved) {
        const title = `Grant NFT collection approval`;
        const summary = `Allow ${operatorLabel} to transfer ALL your NFTs in collection ${collectionLabel}. ⚠️ This affects your entire collection.`;
        return { title, summary };
      } else {
        const title = `Revoke NFT collection approval`;
        const summary = `Remove ${operatorLabel}'s permission to transfer your NFTs in collection ${collectionLabel}.`;
        return { title, summary };
      }
    }

    case "erc721_safeTransferFrom": {
      const tokenId = decoded.args.tokenId as bigint;
      const from = decoded.args.from as `0x${string}`;
      const to = decoded.args.to as `0x${string}`;
      
      const fromLabel = shortenAddress(from);
      const toLabel = shortenAddress(to);
      const collectionLabel = shortenAddress(decoded.contractAddress);

      const title = `Transfer NFT #${tokenId.toString()}`;
      const summary = `Transfer NFT #${tokenId.toString()} from collection ${collectionLabel} from ${fromLabel} to ${toLabel}.`;

      return { title, summary };
    }

    case "erc1155_safeTransferFrom": {
      const id = decoded.args.id as bigint;
      const amount = decoded.args.amount as bigint;
      const from = decoded.args.from as `0x${string}`;
      const to = decoded.args.to as `0x${string}`;
      
      const fromLabel = shortenAddress(from);
      const toLabel = shortenAddress(to);
      const collectionLabel = shortenAddress(decoded.contractAddress);

      const title = `Transfer ${amount.toString()} NFT #${id.toString()}`;
      const summary = `Transfer ${amount.toString()} of NFT #${id.toString()} from collection ${collectionLabel} from ${fromLabel} to ${toLabel}.`;

      return { title, summary };
    }

    case "uniswap_swap": {
      const swapType = decoded.args.swapType as string;
      const contractLabel = shortenAddress(decoded.contractAddress);

      // Basic swap detection - can be enhanced with token symbols
      let title = "Token swap";
      let summary = `Execute token swap on ${contractLabel}.`;

      if (swapType === "exactTokensForTokens" && decoded.args.amountIn && decoded.args.path) {
        const path = decoded.args.path as `0x${string}`[];
        const tokenInAddr = path[0];
        const tokenOutAddr = path[path.length - 1];
        
        if (tokenInAddr && tokenOutAddr) {
          const tokenInMeta = enrichment.tokenMeta?.[tokenInAddr];
          const tokenOutMeta = enrichment.tokenMeta?.[tokenOutAddr];
          
          const amountIn = formatAmount(decoded.args.amountIn as bigint, tokenInMeta?.decimals ?? 18);
          const minOut = formatAmount(decoded.args.amountOutMin as bigint, tokenOutMeta?.decimals ?? 18);
          
          title = `Swap ${amountIn} ${tokenInMeta?.symbol ?? "tokens"}`;
          summary = `Swap ${amountIn} ${tokenInMeta?.symbol ?? "tokens"} for at least ${minOut} ${tokenOutMeta?.symbol ?? "tokens"}.`;
        }
      }

      return { title, summary };
    }

    case "eth_transfer": {
      const value = decoded.args.value as bigint;
      const to = decoded.args.to as `0x${string}`;
      
      const amountText = formatAmount(value, 18); // ETH has 18 decimals
      const toLabel = shortenAddress(to);

      const title = `Send ${amountText} ETH`;
      const summary = `Transfer ${amountText} ETH to ${toLabel}.`;

      return { title, summary };
    }

    case "unknown": {
      const contractLabel = shortenAddress(decoded.contractAddress);
      const selector = decoded.selector ?? "unknown";

      const title = `Unknown contract call (${selector})`;
      const summary = `Call unknown function ${selector} on contract ${contractLabel}. Unable to decode transaction details.`;

      if (riskLevel === "medium" || riskLevel === "high") {
        return {
          title,
          summary: summary + " ⚠️ Exercise caution with unrecognized contract interactions.",
        };
      }

      return { title, summary };
    }

    default: {
      // Fallback case
      return {
        title: "Contract interaction",
        summary: "Interact with smart contract.",
      };
    }
  }
}
