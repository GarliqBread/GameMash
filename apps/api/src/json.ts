import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

export const parseJson = <T extends TSchema>(schema: T, json: string | null | undefined): Static<T> | null => {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return Value.Check(schema, value) ? value : null;
  } catch {
    return null;
  }
};
