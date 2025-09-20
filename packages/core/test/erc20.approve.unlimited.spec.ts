import { describe, it, expect, beforeEach } from "vitest";
import { explainTx } from "../src/index.js";
import { clearInteractionCache } from "../src/risk/index.js";
import type { TxInput, ViemClient } from "../src/types.js";

// Mock viem client for testing with real viem method signatures
const mockClient = {
  chain: { id: 1 },
  transport: {},
  // Mock readContract to return realistic token data
  readContract: async ({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case "symbol":
        return "USDC";
      case "decimals":
        return 6;
      case "name":
        return "USD Coin";
      case "allowance":
        return 0n;
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  },
  // Mock getCode to return empty (not a contract)
  getCode: async () => "0x",
} as any;

describe("ERC20 Approve Unlimited", () => {
  beforeEach(() => {
    // Clear interaction cache before each test
    clearInteractionCache();
  });

  it("should detect unlimited USDC approval and return high risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0xA0b86a33E6441b8bE791DD390cd1B45fb16aD7C6", // Mock USDC address
      from: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9", // Mock user address
      data: "0x095ea7b30000000000000000000000001111111111111111111111111111111111111111ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // approve(spender, unlimited)
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Approve");
    expect(result.title).toContain("unlimited");
    expect(result.riskLevel).toBe("high"); // Should be high due to unlimited approval
    expect(result.findings).toHaveLength(2); // ALLOWANCE_UNLIMITED + NEW_SPENDER (no TOKEN_META_UNKNOWN since we have real data)
    expect(result.findings.some(f => f.code === "ALLOWANCE_UNLIMITED")).toBe(true);
    expect(result.summary).toContain("unlimited");
  });

  it("should handle limited approval with lower risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0xA0b86a33E6441b8bE791DD390cd1B45fb16aD7C6",
      from: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      data: "0x095ea7b30000000000000000000000001111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000000a", // approve 10 tokens
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).not.toContain("unlimited");
    expect(result.riskLevel).toBe("medium"); // NEW_SPENDER only (no TOKEN_META_UNKNOWN since we have real data)
    expect(result.findings.some(f => f.code === "ALLOWANCE_UNLIMITED")).toBe(false);
  });
});
