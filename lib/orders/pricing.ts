/**
 * Order pricing in integers. No floating point is ever used for money.
 *
 * Amounts are carried as BigInt "minor units" scaled by the currency decimals
 * (TND has 3, so 12.500 is 12500n). Database decimals arrive as strings and are
 * parsed digit by digit. Nothing here imports app code, so node:test runs it.
 *
 * Promotion rules (per unit, per dish):
 *   PERCENTAGE   - that percent of the unit price, rounded half up.
 *   FIXED_AMOUNT - that amount off each unit, never more than the unit price.
 *   A dish with several live promotions gets the single best one. No stacking.
 */

// tsconfig targets ES2017, which has no BigInt literals (0n) or ** on bigint.
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN_THOUSAND = BigInt(10000);

export type PromotionKind = "PERCENTAGE" | "FIXED_AMOUNT";

export type PromotionInput = {
  id: string;
  type: PromotionKind;
  /** Decimal string as stored, e.g. "15" or "2.500". */
  value: string;
};

/** How many decimals the currency uses (TND 3, EUR 2, JPY 0). */
export function currencyDecimals(currency: string): number {
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    return digits ?? 2;
  } catch {
    return 2;
  }
}

/**
 * Parses a non-negative decimal string into an integer scaled by `scale`.
 * Extra digits are rounded half up. Throws on anything that is not a plain decimal.
 */
export function parseDecimal(value: string, scale: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error(`Not a decimal amount: ${value}`);
  const fraction = match[2] ?? "";
  const kept = fraction.slice(0, scale).padEnd(scale, "0");
  let scaled = BigInt(match[1] + "0".repeat(scale)) + BigInt(kept === "" ? "0" : kept);
  if (fraction.length > scale && fraction.charCodeAt(scale) >= 53) scaled += ONE; // '5' or above
  return scaled;
}

/** Writes an integer scaled by `decimals` back as an exact decimal string. */
export function formatMinor(minor: bigint, decimals: number): string {
  const negative = minor < ZERO;
  const digits = (negative ? -minor : minor).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals > 0 ? `.${digits.slice(digits.length - decimals)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * TWO + denominator) / (denominator * TWO);
}

/** Discount for ONE unit, in minor units, never above the unit price. */
export function unitDiscount(unitPrice: bigint, promotion: PromotionInput, decimals: number): bigint {
  let discount: bigint;
  if (promotion.type === "PERCENTAGE") {
    const hundredths = parseDecimal(promotion.value, 2); // 12.5% -> 1250
    discount = divideRoundHalfUp(unitPrice * hundredths, TEN_THOUSAND);
  } else {
    discount = parseDecimal(promotion.value, decimals);
  }
  return discount > unitPrice ? unitPrice : discount;
}

export type PricedUnit = {
  unitPrice: bigint;
  unitDiscount: bigint;
  promotionId: string | null;
};

/** Picks the single best promotion for a dish; ties go to the smaller id. */
export function priceUnit(price: string, promotions: PromotionInput[], decimals: number): PricedUnit {
  const unitPrice = parseDecimal(price, decimals);
  let best: PricedUnit = { unitPrice, unitDiscount: ZERO, promotionId: null };
  for (const promotion of promotions) {
    const discount = unitDiscount(unitPrice, promotion, decimals);
    const better =
      discount > best.unitDiscount ||
      (discount === best.unitDiscount && discount > ZERO && best.promotionId !== null && promotion.id < best.promotionId);
    if (better) best = { unitPrice, unitDiscount: discount, promotionId: promotion.id };
  }
  return best;
}

export type PricedLine = PricedUnit & { quantity: number };

export type OrderTotals = {
  subtotal: bigint;
  discount: bigint;
  total: bigint;
};

/** subtotal = sum of unit price x quantity; discount likewise; total = subtotal - discount. */
export function computeTotals(lines: PricedLine[]): OrderTotals {
  let subtotal = ZERO;
  let discount = ZERO;
  for (const line of lines) {
    const quantity = BigInt(line.quantity);
    subtotal += line.unitPrice * quantity;
    discount += line.unitDiscount * quantity;
  }
  return { subtotal, discount, total: subtotal - discount };
}
