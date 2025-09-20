import type { Finding, RiskLevel, DecodedTx, EnrichmentData } from "../types.js";
import { isUnlimited } from "../utils.js";

// Risk scoring weights (higher = more risky)
const RISK_SCORES = {
  info: 1,
  warn: 5,
  danger: 10,
} as const;

// Risk level thresholds based on aggregate score
const RISK_THRESHOLDS = {
  low: 0,      // 0-2 points
  medium: 3,   // 3-7 points  
  high: 8,     // 8+ points
} as const;

// Simple in-memory cache for tracking first-time interactions
const interactionCache = new Set<string>();

/**
 * Generate risk findings based on decoded transaction and enrichment data
 */
export function generateFindings(
  decoded: DecodedTx,
  enrichment: EnrichmentData,
  fromAddress?: `0x${string}`
): Finding[] {
  const findings: Finding[] = [];

  switch (decoded.type) {
    case "erc20_approve": {
      const amount = decoded.args.amount as bigint;
      const spender = decoded.args.spender as `0x${string}`;

      // Check for unlimited approval
      if (isUnlimited(amount)) {
        findings.push({
          level: "warn",
          code: "ALLOWANCE_UNLIMITED",
          message: "This approval grants unlimited token spending permission",
        });
      }

      // Check if spender is a new contract
      if (fromAddress) {
        const interactionKey = `${fromAddress}-${spender}`;
        if (!interactionCache.has(interactionKey)) {
          interactionCache.add(interactionKey);
          findings.push({
            level: "warn",
            code: "NEW_SPENDER",
            message: "First time interacting with this spender",
          });
        }
      }

      // Check if spender is a contract
      if (enrichment.contractFlags?.[spender]) {
        findings.push({
          level: "info",
          code: "SPENDER_IS_CONTRACT",
          message: "Spender is a smart contract",
        });
      }

      // Check for token metadata issues
      const tokenMeta = enrichment.tokenMeta?.[decoded.contractAddress];
      if (!tokenMeta || tokenMeta.symbol === "UNKNOWN") {
        findings.push({
          level: "warn",
          code: "TOKEN_META_UNKNOWN",
          message: "Could not verify token information",
        });
      }

      break;
    }

    case "erc721_setApprovalForAll":
    case "erc1155_setApprovalForAll": {
      const approved = decoded.args.approved as boolean;
      
      if (approved) {
        findings.push({
          level: "danger",
          code: "SET_APPROVAL_FOR_ALL_TRUE",
          message: "This grants permission to transfer ALL your NFTs in this collection",
        });
      } else {
        findings.push({
          level: "info",
          code: "SET_APPROVAL_FOR_ALL_FALSE",
          message: "This revokes NFT transfer permissions",
        });
      }

      break;
    }

    case "erc20_transfer":
    case "erc721_safeTransferFrom":
    case "erc1155_safeTransferFrom": {
      const to = decoded.args.to as `0x${string}`;

      // Check if recipient is a contract
      if (enrichment.contractFlags?.[to]) {
        findings.push({
          level: "info",
          code: "TRANSFER_TO_CONTRACT",
          message: "Recipient is a smart contract",
        });
      }

      break;
    }

    case "eth_transfer": {
      const to = decoded.args.to as `0x${string}`;

      // Check if recipient is a contract
      if (enrichment.contractFlags?.[to]) {
        findings.push({
          level: "info",
          code: "ETH_TO_CONTRACT",
          message: "Sending ETH to a smart contract",
        });
      }

      break;
    }

    case "uniswap_swap": {
      findings.push({
        level: "info",
        code: "UNISWAP_SWAP_DETECTED",
        message: "Token swap transaction",
      });

      // Check for token metadata on swap tokens
      if (decoded.args.tokenIn) {
        const tokenMeta = enrichment.tokenMeta?.[decoded.args.tokenIn as `0x${string}`];
        if (!tokenMeta || tokenMeta.symbol === "UNKNOWN") {
          findings.push({
            level: "warn",
            code: "SWAP_TOKEN_UNKNOWN",
            message: "Could not verify input token information",
          });
        }
      }

      break;
    }

    case "unknown": {
      findings.push({
        level: "warn",
        code: "UNKNOWN_SELECTOR",
        message: "Unknown function call - unable to decode transaction details",
      });

      break;
    }
  }

  return findings;
}

/**
 * Calculate overall risk level based on findings
 */
export function evaluateRisk(findings: Finding[]): RiskLevel {
  const totalScore = findings.reduce((sum, finding) => {
    return sum + RISK_SCORES[finding.level];
  }, 0);

  if (totalScore >= RISK_THRESHOLDS.high) {
    return "high";
  } else if (totalScore >= RISK_THRESHOLDS.medium) {
    return "medium";
  } else {
    return "low";
  }
}

/**
 * Clear the interaction cache (useful for testing)
 */
export function clearInteractionCache(): void {
  interactionCache.clear();
}
