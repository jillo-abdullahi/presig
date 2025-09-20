/**
 * Utility functions for hex manipulation, number formatting, and common checks
 */

// Check if a value represents unlimited approval (>= 2^255)
export function isUnlimited(value: bigint): boolean {
  // 2^255 = 57896044618658097711785492504343953926634992332820282019728792003956564819968n
  const threshold = 1n << 255n;
  return value >= threshold;
}

// Format token amounts with proper decimal handling
export function formatAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) {
    return amount.toString();
  }

  const divisor = 10n ** BigInt(decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === 0n) {
    return quotient.toString();
  }

  // Format with decimals, removing trailing zeros
  const remainderStr = remainder.toString().padStart(decimals, "0");
  const trimmed = remainderStr.replace(/0+$/, "");
  
  if (trimmed === "") {
    return quotient.toString();
  }

  return `${quotient}.${trimmed}`;
}

// Shorten address for display (0x1234...5678)
export function shortenAddress(address: `0x${string}`, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Extract function selector from calldata
export function getSelector(data?: `0x${string}`): `0x${string}` | undefined {
  if (!data || data.length < 10) return undefined;
  return data.slice(0, 10) as `0x${string}`;
}

// Check if string is valid hex
export function isHex(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

// Safe bigint parsing
export function parseBigInt(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      return BigInt(value);
    }
    return BigInt(value);
  }
  throw new Error(`Cannot parse BigInt from ${typeof value}`);
}
