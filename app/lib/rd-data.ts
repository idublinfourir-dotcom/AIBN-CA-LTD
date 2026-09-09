/* Server-side loader for the Ireland R&D tax credit calculator.
   Thin typed wrapper over the shared getCalculatorConfig: reads the editable
   config (calculator_settings, key 'rd-credit'); falls back to RD_CONFIG_DEFAULT
   when the row is absent, invalid, or the DB is unreachable, so the calculator
   never renders broken numbers. Never throws.

   The prose-only fields (effectiveBenefitPercent, effectiveFrom) stay in code on
   RD_CREDIT and are imported directly by the component. */

import { getCalculatorConfig, type CalculatorConfigResult } from "./calculator-settings";
import { RD_CONFIG_DEFAULT, parseRdConfig, type RdConfig } from "./ireland-rd-tax-credit";

export const RD_SETTINGS_KEY = "rd-credit";

export function getRdData(): Promise<CalculatorConfigResult<RdConfig>> {
  return getCalculatorConfig(RD_SETTINGS_KEY, parseRdConfig, RD_CONFIG_DEFAULT);
}
