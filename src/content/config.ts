import { defineCollection, z } from 'astro:content';

const team = defineCollection({
  type: 'content',
  schema: z.object({
    name_ko: z.string(),
    name_en: z.string(),
    title_ko: z.string(),
    title_en: z.string(),
    role_badge: z.string(),
    campus: z.enum(['pyeongtaek', 'jeju']),
    category: z.enum(['missionary', 'stw']),
    order: z.number().default(99),
    photo_url: z.string().optional(),
    bio_ko: z.string().optional(),
    bio_en: z.string().optional(),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title_ko: z.string(),
    title_en: z.string().optional(),
    date: z.coerce.date(),
    thumbnail: z.string().optional(),
    category: z.enum(['mission-report', 'camp', 'wolbi', 'youth', 'general']).default('general'),
    body_en: z.string().optional(),
  }),
});

export const collections = { team, news };
