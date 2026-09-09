/* Server-side loader for the Ireland capital allowances calculator.
   Thin typed wrapper over the shared getCalculatorConfig: reads the editable
   asset-class rates/years + the two scalars (calculator_settings, key
   'capital-allowances'); falls back to CA_CONFIG_DEFAULT when the row is absent,
   invalid, or the DB is unreachable, so the calculator never renders broken
   numbers. Never throws.

   The CO2 emissions groups + CAR_2027_NOTE stay in code and are imported
   directly by the component; only the per-class rate/years and the car cap +
   trading CT rate are DB-backed. */

import { getCalculatorConfig, type CalculatorConfigResult } from "./calculator-settings";
import { CA_CONFIG_DEFAULT, parseCaConfig, type CaConfig } from "./ireland-capital-allowances";

export const CA_SETTINGS_KEY = "capital-allowances";

export function getCaData(): Promise<CalculatorConfigResult<CaConfig>> {
  return getCalculatorConfig(CA_SETTINGS_KEY, parseCaConfig, CA_CONFIG_DEFAULT);
}
