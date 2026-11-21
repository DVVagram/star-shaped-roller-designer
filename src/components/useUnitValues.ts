import { useCallback, useState } from "react";

import {
  decimalsFor,
  formatNumber,
  parseInput,
  unitToMm,
  type LengthUnit,
} from "@/lib/kit/units";

/**
 * Holds a designer's form as strings, converting every length field when the
 * unit toggle changes so the millimetre spec stays exactly the same.
 */
export function useUnitValues<F extends string>(
  defaults: Record<F, string>,
  lengthFields: readonly F[],
  initial?: { units: LengthUnit; values: Partial<Record<F, string>> } | null,
) {
  const [units, setUnitsState] = useState<LengthUnit>(initial?.units ?? "mm");
  const [values, setValues] = useState<Record<F, string>>(() => ({
    ...defaults,
    ...(initial?.values ?? {}),
  }));

  const setField = useCallback((field: F, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const replaceValues = useCallback((next: Record<string, string>) => {
    setValues((current) => ({ ...current, ...next }));
  }, []);

  const setUnits = useCallback(
    (next: LengthUnit) => {
      if (next === units) return;
      setValues((current) => {
        const copy = { ...current };
        for (const field of lengthFields) {
          const parsed = parseInput(copy[field]);
          if (parsed === null) continue;
          const millimetres = unitToMm(parsed, units);
          const converted = next === "in" ? millimetres / 25.4 : millimetres;
          copy[field] = formatNumber(converted, decimalsFor(next));
        }
        return copy;
      });
      setUnitsState(next);
    },
    [units, lengthFields],
  );

  const reset = useCallback(() => {
    setUnitsState("mm");
    setValues(defaults);
  }, [defaults]);

  return { units, values, setField, replaceValues, setUnits, reset };
}
