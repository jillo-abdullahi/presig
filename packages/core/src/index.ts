// Export all public types
export type {
  TxInput,
  Finding,
  RiskLevel,
  ExplainerOutput,
  DecodedTx,
  TokenMeta,
  EnrichmentData,
  ViemClient,
} from "./types.js";

// Export main function
export { explainTx } from "./explain.js";

// Export utilities that consumers might find useful
export {
  formatAmount,
  shortenAddress,
  isUnlimited,
  getSelector,
} from "./utils.js";

// Export decoder functions for advanced usage
export { decodeTx, decodeERC20, decodeNFT, decodeUniswap } from "./decode/index.js";

// Export enrichment functions
export { getTokenMeta, getAllowance, isContract, enrichTx } from "./enrich/onchain.js";

// Export risk evaluation functions
export { generateFindings, evaluateRisk, clearInteractionCache } from "./risk/index.js";

// Export text generation
export { generateExplanation } from "./text/templates.js";
