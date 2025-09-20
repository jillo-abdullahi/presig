import type { PublicClient } from "viem";

// Core input type for transaction analysis
export interface TxInput {
  chainId: number;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  from?: `0x${string}`;
}

// Risk finding with severity level
export interface Finding {
  level: "info" | "warn" | "danger";
  code: string;
  message: string;
}

// Overall risk assessment
export type RiskLevel = "low" | "medium" | "high";

// Main output of the explainer
export interface ExplainerOutput {
  title: string;
  summary: string;
  riskLevel: RiskLevel;
  findings: Finding[];
  artifacts: Record<string, unknown>;
}

// Decoded transaction details
export interface DecodedTx {
  type: "erc20_approve" | "erc20_transfer" | "erc20_transferFrom" | "erc20_permit" | 
        "erc721_setApprovalForAll" | "erc1155_setApprovalForAll" | "erc721_safeTransferFrom" | 
        "erc1155_safeTransferFrom" | "uniswap_swap" | "eth_transfer" | "unknown";
  selector?: `0x${string}`;
  args: Record<string, unknown>;
  contractAddress: `0x${string}`;
}

// Token metadata from on-chain lookup
export interface TokenMeta {
  symbol: string;
  decimals: number;
  name?: string | undefined;
}

// On-chain enrichment data
export interface EnrichmentData {
  tokenMeta?: Record<`0x${string}`, TokenMeta>;
  allowances?: Record<string, bigint>;
  contractFlags?: Record<`0x${string}`, boolean>;
}

// Viem client interface (for dependency injection)
export type ViemClient = PublicClient;
