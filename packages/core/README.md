# @presig/core

**Know what you sign, before you sign.**

A deterministic Ethereum transaction decoder with rule-based risk insights. This TypeScript library decodes common Ethereum transactions into plain-English explanations and provides security risk assessments.

## Features

- 🔍 **Deterministic decoding** — ERC20, ERC721, ERC1155, Uniswap swaps, ETH transfers
- ⚠️ **Risk assessment** — Rule-based engine detecting unlimited approvals, NFT risks, unknown interactions  
- 🌐 **Multi-chain** — Works with any EVM chain via viem PublicClient
- 📝 **Human-readable** — Template-based explanations in plain English
- 🔧 **Type-safe** — Full TypeScript support with exported types
- ⚡ **Zero dependencies** — Only requires `viem` as a peer dependency
- 🧪 **Well tested** — Comprehensive test suite with 100% core functionality coverage

## Installation

```bash
npm install @presig/core viem
# or
pnpm add @presig/core viem
```

## Quick Start

```typescript
import { explainTx } from "@presig/core";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// Create viem client
const client = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"),
});

// Analyze a transaction
const result = await explainTx({
  chainId: 1,
  to: "0xA0b86a33E6441b8bE791DD390cd1B45fb16aD7C6", // USDC
  from: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
  data: "0x095ea7b3000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000ffffffffffffffff",
}, client);

console.log(result);
// {
//   title: "Approve unlimited USDC",
//   summary: "Grant permission to spend unlimited USDC to 0x1111...1111. ⚠️ This is an unlimited approval - the spender can use all your tokens.",
//   riskLevel: "high",
//   findings: [
//     { level: "warn", code: "ALLOWANCE_UNLIMITED", message: "This approval grants unlimited token spending permission" },
//     { level: "warn", code: "NEW_SPENDER", message: "First interaction with this spender address" },
//     { level: "warn", code: "TOKEN_META_UNKNOWN", message: "Could not verify token information" }
//   ]
// }
//     { level: "warn", code: "ALLOWANCE_UNLIMITED", message: "This approval grants unlimited token spending permission" }
//   ],
//   artifacts: { ... }
// }
```

## Supported Transaction Types

- **ERC20**: `approve`, `transfer`, `transferFrom`, `permit`
- **ERC721/ERC1155**: `setApprovalForAll`, `safeTransferFrom`  
- **Uniswap**: Basic V2/V3 swap detection
- **ETH transfers**: Plain ether sends
- **Unknown calls**: Safe fallback with risk warnings

## Risk Levels & Findings

### Risk Levels
- `low` — Normal operation, minimal risk
- `medium` — Caution recommended (unknown contracts, new interactions)
- `high` — Significant risk (unlimited approvals, NFT collection approvals)

### Common Findings
- `ALLOWANCE_UNLIMITED` — ERC20 approval >= 2^255
- `SET_APPROVAL_FOR_ALL_TRUE` — NFT collection-wide approval  
- `NEW_SPENDER` — First interaction with this spender address
- `UNKNOWN_SELECTOR` — Unrecognized function call
- `TOKEN_META_UNKNOWN` — Could not fetch token metadata

## Advanced Usage

```typescript
import { 
  decodeTx, 
  generateFindings, 
  evaluateRisk, 
  formatAmount, 
  isUnlimited 
} from "@presig/core";

// Use individual functions for custom workflows
const decoded = decodeTx(txInput);
const findings = generateFindings(decoded, enrichmentData);
const risk = evaluateRisk(findings);
```

## API Reference

### `explainTx(input, client)`

Main function that orchestrates decoding → enrichment → risk assessment → explanation.

**Parameters:**
- `input: TxInput` — Transaction details
- `client: PublicClient` — viem client for on-chain queries

**Returns:** `Promise<ExplainerOutput>`

### Types

```typescript
interface TxInput {
  chainId: number;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  from?: `0x${string}`;
}

interface ExplainerOutput {
  title: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  findings: Finding[];
  artifacts: Record<string, unknown>;
}
```

## Roadmap

This is the core decoding library. Upcoming packages:

- `@presig/react` — React components with Tailwind UI
- `@presig/widget` — Vanilla JS widget for any website  
- `@presig/api` — Serverless backend for enhanced data

## License

MIT
