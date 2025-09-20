import { describe, it, expect } from "vitest";
import { explainTx } from "../src/index.js";
import type { TxInput, ViemClient } from "../src/types.js";

const mockClient = {
  chain: { id: 1 },
  transport: {},
  readContract: async () => {
    throw new Error("Not a token contract");
  },
  getCode: async () => "0x", // Return empty to indicate it's not a contract
} as any;

describe("ETH Transfer", () => {
  it("should detect ETH transfer and return low risk", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      from: "0x1111111111111111111111111111111111111111",
      value: BigInt("1000000000000000000"), // 1 ETH in wei
      data: "0x", // No data for plain ETH transfer
    };

    const result = await explainTx(tx, mockClient);

    expect(result.title).toContain("Send 1 ETH");
    expect(result.riskLevel).toBe("low");
    expect(result.summary).toContain("Transfer 1 ETH");
    expect(result.findings).toHaveLength(0); // No findings since mocked isContract returns false
  });

  it("should handle ETH transfer with no value", async () => {
    const tx: TxInput = {
      chainId: 1,
      to: "0x742d35Cc6634C0532925a3b8D9C9C8Cc61E7b6C9",
      from: "0x1111111111111111111111111111111111111111",
      value: BigInt("0"),
      data: "0x",
    };

    const result = await explainTx(tx, mockClient);

    // Should fall through to unknown since no value and no data
    expect(result.title).toContain("Unknown contract call");
    expect(result.riskLevel).toBe("medium");
  });
});
