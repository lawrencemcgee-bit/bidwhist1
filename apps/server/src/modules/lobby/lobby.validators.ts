import { z } from 'zod';

export const createTableSchema = z.object({
  name: z.string().min(2).max(40),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
