import { z } from "zod";

// Define this module's Zod schemas + inferred types here.
// Example:
// export const exampleSchema = z.object({ id: z.string() });
// export type Example = z.infer<typeof exampleSchema>;

export const _templateSchema = z.object({});
export type Template = z.infer<typeof _templateSchema>;
