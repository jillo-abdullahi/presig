import type { TxInput, ViemClient, ExplainerOutput } from "./types.js";
import { decodeTx } from "./decode/index.js";
import { enrichTx } from "./enrich/onchain.js";
import { generateFindings, evaluateRisk } from "./risk/index.js";
import { generateExplanation } from "./text/templates.js";

/**
 * Main entry point: decode transaction, enrich with on-chain data, 
 * assess risk, and generate human-readable explanation
 */
export async function explainTx(
  input: TxInput,
  client: ViemClient
): Promise<ExplainerOutput> {
  // Step 1: Decode the transaction
  const decoded = decodeTx(input);

  // Step 2: Enrich with on-chain data
  const enrichment = await enrichTx(decoded, client, input.from);

  // Step 3: Generate risk findings
  const findings = generateFindings(decoded, enrichment, input.from);

  // Step 4: Calculate overall risk level
  const riskLevel = evaluateRisk(findings);

  // Step 5: Generate human-readable explanation
  const { title, summary } = generateExplanation(decoded, enrichment, riskLevel);

  // Step 6: Compile artifacts for debugging/advanced usage
  const artifacts = {
    decoded,
    enrichment,
    input: {
      chainId: input.chainId,
      to: input.to,
      value: input.value?.toString(),
      data: input.data,
      from: input.from,
    },
  };

  return {
    title,
    summary,
    riskLevel,
    findings,
    artifacts,
  };
}
