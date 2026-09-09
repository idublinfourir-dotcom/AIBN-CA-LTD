/* Server-side loader for the Ireland VAT calculator.
   Thin typed wrapper over the shared getCalculatorConfig: reads the editable
   rates + thresholds (calculator_settings, key 'vat'); falls back to
   VAT_CONFIG_DEFAULT when the row is absent, invalid, or the DB is unreachable:
   so the calculator never renders broken numbers. Never throws.

   VAT_CATEGORIES (the taxonomy of what maps to which rate) stays in code and is
   imported directly by the component; only the rate percents/labels + the
   thresholds are DB-backed. */

import { getCalculatorConfig, type CalculatorConfigResult } from "./calculator-settings";
import { VAT_CONFIG_DEFAULT, parseVatConfig, type VatConfig } from "./ireland-vat";

export const VAT_SETTINGS_KEY = "vat";

export function getVatData(): Promise<CalculatorConfigResult<VatConfig>> {
  return getCalculatorConfig(VAT_SETTINGS_KEY, parseVatConfig, VAT_CONFIG_DEFAULT);
}
