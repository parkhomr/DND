import { z } from 'zod';
export const intentSchema = z
  .object({
    kind: z.enum([
      'look',
      'talk',
      'travel',
      'buy',
      'sell',
      'use',
      'equip',
      'rest',
      'search',
      'steal',
      'persuade',
      'attack',
      'cast',
      'guard',
      'flee',
      'move',
      'wait',
      'burn',
      'property',
      'join',
      'quest',
      'improvise',
    ]),
    target: z.string().max(160),
    detail: z.string().max(1500),
  })
  .strict();
export const characterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Имя должно содержать не меньше двух букв.')
      .max(30)
      .regex(/^[\p{L}\p{M} '\-]+$/u, 'Используйте буквы, пробелы или дефис.'),
    ancestry: z.enum(['Человек', 'Сумеречный эльф', 'Камнерождённый', 'Полурослик']),
    classId: z.enum(['warrior', 'rogue', 'mage', 'warden']),
    background: z.enum(['Изгнанник', 'Наёмник', 'Учёный', 'Бродяга', 'Дворянин']),
    portrait: z.number().int().min(0).max(5),
    focus: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']),
  })
  .strict();
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(1500) }).strict(),
  z.object({ type: z.literal('intent'), intent: intentSchema }).strict(),
  z
    .object({
      type: z.literal('roll'),
      sides: z.union([
        z.literal(4),
        z.literal(6),
        z.literal(8),
        z.literal(10),
        z.literal(12),
        z.literal(20),
      ]),
      mode: z.enum(['normal', 'advantage', 'disadvantage']),
    })
    .strict(),
]);
