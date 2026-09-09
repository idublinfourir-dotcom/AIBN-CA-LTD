/* ──────────────────────────────────────────────────────────────────────────
   Working Capital calculator (finance, not tax).

   PURE FUNCTIONS ONLY, no React, no I/O, so every figure is unit-testable.

   These are STANDARD financial-analysis definitions, not Revenue tax figures:
   there are no statutory "rates" to source:
     • Working capital   = current assets − current liabilities
     • Current ratio     = current assets ÷ current liabilities
     • Quick ratio       = (current assets − inventory) ÷ current liabilities
                           (the acid test: excludes stock, the least liquid
                           current asset)

   Interpretation of the ratios (healthy vs tight) is a rule of thumb and
   varies by industry and season: the UI states that.
   ────────────────────────────────────────────────────────────────────────── */

/** Round to 2 decimal places, absorbing binary-float error. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type WcDirection = "surplus" | "deficit" | "balanced";

export interface WorkingCapitalInput {
  currentAssets: number;
  currentLiabilities: number;
  /** Optional: enables the quick (acid-test) ratio. */
  inventory?: number;
}

export interface WorkingCapitalResult {
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  /** current assets − current liabilities (signed). */
  workingCapital: number;
  direction: WcDirection;
  /** current assets ÷ current liabilities; null when there are no liabilities. */
  currentRatio: number | null;
  /** (current assets − inventory) ÷ current liabilities; null when no liabilities. */
  quickRatio: number | null;
}

/**
 * Compute working capital and the liquidity ratios.
 *   workingCapital = currentAssets − currentLiabilities
 *   currentRatio   = currentAssets ÷ currentLiabilities
 *   quickRatio     = (currentAssets − inventory) ÷ currentLiabilities
 * Ratios are null when there are no current liabilities (no divide-by-zero).
 */
export function computeWorkingCapital(
  input: WorkingCapitalInput,
): WorkingCapitalResult {
  const currentAssets = round2(Math.max(0, input.currentAssets));
  const currentLiabilities = round2(Math.max(0, input.currentLiabilities));
  // Inventory is a current asset, so it can't exceed total current assets.
  const inventory = round2(
    Math.min(Math.max(0, input.inventory ?? 0), currentAssets),
  );

  const workingCapital = round2(currentAssets - currentLiabilities);
  const direction: WcDirection =
    workingCapital > 0 ? "surplus" : workingCapital < 0 ? "deficit" : "balanced";

  const currentRatio =
    currentLiabilities > 0 ? round2(currentAssets / currentLiabilities) : null;
  const quickRatio =
    currentLiabilities > 0
      ? round2((currentAssets - inventory) / currentLiabilities)
      : null;

  return {
    currentAssets,
    currentLiabilities,
    inventory,
    workingCapital,
    direction,
    currentRatio,
    quickRatio,
  };
}
