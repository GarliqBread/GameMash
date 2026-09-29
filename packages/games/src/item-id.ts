import { Type } from "typebox";

export const ItemIdSchema = Type.String({ minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" });
