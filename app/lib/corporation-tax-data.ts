/* Server-side loader for the Ireland corporation tax calculator.
   Thin typed wrapper over the shared getCalculatorConfig: reads the editable
   config (calculator_settings, key 'corporation-tax'); falls back to
   CT_CONFIG_DEFAULT when the row is absent, invalid, or the DB is unreachable:
   so the calculator never renders broken numbers. Never throws. */

import { getCalculatorConfig, type CalculatorConfigResult } from "./calculator-settings";
import {
  CT_CONFIG_DEFAULT,
  parseCorporationTaxConfig,
  type CtConfig,
} from "./ireland-corporation-tax";

export const CT_SETTINGS_KEY = "corporation-tax";

export function getCorporationTaxData(): Promise<CalculatorConfigResult<CtConfig>> {
  return getCalculatorConfig(CT_SETTINGS_KEY, parseCorporationTaxConfig, CT_CONFIG_DEFAULT);
}
