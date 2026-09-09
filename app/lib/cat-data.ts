/* Server-side loader for the Ireland CAT calculator. Thin typed wrapper over the
   shared getCalculatorConfig: reads the editable rate/thresholds/reliefs
   (calculator_settings, key 'cat'); falls back to CAT_CONFIG_DEFAULT when the
   row is absent, invalid, or the DB is unreachable, so the calculator never
   renders broken numbers. Never throws. Mirrors vat-data.ts. */

import { getCalculatorConfig, type CalculatorConfigResult } from "./calculator-settings";
import { CAT_CONFIG_DEFAULT, parseCatConfig, type CatConfig } from "./ireland-cat";

export const CAT_SETTINGS_KEY = "cat";

export function getCatData(): Promise<CalculatorConfigResult<CatConfig>> {
  return getCalculatorConfig(CAT_SETTINGS_KEY, parseCatConfig, CAT_CONFIG_DEFAULT);
}
