import { z } from "zod";

type WithoutDefaults<Shape> = {
  [Field in keyof Shape]: Shape[Field] extends z.ZodDefault<infer Schema> ? Schema : Shape[Field];
};

/** A partial update leaves omitted fields alone, including fields with creation defaults. */
export function patchSchema<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
  const fields = Object.fromEntries(Object.entries(schema.shape).map(([name, field]) => [
    name, field instanceof z.ZodDefault ? field.removeDefault() : field
  ])) as WithoutDefaults<Shape>;
  return z.object(fields).partial();
}
