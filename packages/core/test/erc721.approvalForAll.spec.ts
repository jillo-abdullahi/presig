import { describe, it, expect } from "vitest";
import { explainTx } from "../src/index.js";
import type { TxInput, ViemClient } from "../src/types.js";

// Mock viem client for testing
const mockClient = {
  chain: { id: 1 },
  transport: {},
  readContract: async ({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case "symbol":
        return "BAYC";
      case "name":
        return "Bored Ape Yacht Club";
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  },
  getCode: async () => "0x123", // Return bytecode to indicate it's a contract
} as any;

describe("ERC721 setApprovalForAll", () => {
  it("should detect setApprovalForAll(true) and return high risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x1234567890123456789012345678901234567890", // Mock NFT collection
      from: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      data: "0xa22cb46500000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001", // setApprovalForAll(operator, true)
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Grant NFT collection approval");
    expect(result.riskLevel).toBe("high"); // Should be high due to approval for all
    expect(result.findings.some(f => f.code === "SET_APPROVAL_FOR_ALL_TRUE")).toBe(true);
    expect(result.summary).toContain("ALL your NFTs");
  });

  it("should detect setApprovalForAll(false) as revoke with low risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x1234567890123456789012345678901234567890",
      from: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      data: "0xa22cb46500000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000000", // setApprovalForAll(operator, false)
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Revoke NFT collection approval");
    expect(result.riskLevel).toBe("low");
    expect(result.findings.some(f => f.code === "SET_APPROVAL_FOR_ALL_FALSE")).toBe(true);
    expect(result.summary).toContain("Remove");
  });
});
