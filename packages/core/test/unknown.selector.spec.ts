import { describe, it, expect } from "vitest";
import { explainTx } from "../src/index.js";
import type { TxInput, ViemClient } from "../src/types.js";

const mockClient = {
  chain: { id: 1 },
  transport: {},
  readContract: async () => {
    throw new Error("Unknown contract");
  },
  getCode: async () => "0x123", // Return bytecode to indicate it's a contract
} as any;

describe("Unknown Selector", () => {
  it("should handle unknown function selector and return medium risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      from: "0x1111111111111111111111111111111111111111",
      data: "0x12345678000000000000000000000000000000000000000000000000000000000000000a", // Unknown selector
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Unknown contract call (0x12345678)");
    expect(result.riskLevel).toBe("medium");
    expect(result.findings.some(f => f.code === "UNKNOWN_SELECTOR")).toBe(true);
    expect(result.summary).toContain("Unable to decode transaction details");
  });

  it("should handle completely empty data", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      from: "0x1111111111111111111111111111111111111111",
      // No data field
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Unknown contract call");
    expect(result.riskLevel).toBe("medium");
    expect(result.findings.some(f => f.code === "UNKNOWN_SELECTOR")).toBe(true);
  });
});
