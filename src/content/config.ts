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
    // 사진
    photo_url:    z.string().optional(),
    photo_story:  z.string().optional(),
    photo_url_2:  z.string().optional(),
    // 히어로 문구
    hero_tagline_ko:  z.string().optional(),
    hero_tagline_en:  z.string().optional(),
    hero_tagline2_ko: z.string().optional(),
    hero_tagline2_en: z.string().optional(),
    hero_subtitle_ko: z.string().optional(),
    hero_subtitle_en: z.string().optional(),
    // Life Verse
    verse_ref: z.string().optional(),
    verse_ko:  z.string().optional(),
    verse_en:  z.string().optional(),
    // 배우자
    spouse_ko:    z.string().optional(),
    spouse_en:    z.string().optional(),
    show_spouse:  z.boolean().default(false).optional(),
    // 소개
    bio_ko:   z.string().optional(),
    bio_en:   z.string().optional(),
    bio_ko_2: z.string().optional(),
    bio_en_2: z.string().optional(),
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

const mission_report = defineCollection({
  type: 'data',
  schema: z.object({
    title_ko: z.string(),
    title_en: z.string(),
    date: z.coerce.date(),
    pdf_url: z.string(),
    thumbnail_url: z.string().optional(),
    description_ko: z.string().optional(),
    description_en: z.string().optional(),
  }),
});

const camp_schedule = defineCollection({
  type: 'data',
  schema: z.object({
    title_ko: z.string(),
    title_en: z.string(),
    camp_type: z.enum(['english', 'jeju', 'union']),
    date_ko: z.string(),
    date_en: z.string(),
    target_ko: z.string(),
    target_en: z.string(),
    status: z.enum(['open', 'closed', 'upcoming', 'full']),
    registration_url: z.string().optional(),
    use_external_form: z.preprocess(
      (v) => v === true || v === 'true',
      z.boolean()
    ).optional().default(false),
    deadline_ko: z.string().optional(),
    deadline_en: z.string().optional(),
    price_ko: z.string().optional(),
    price_en: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().optional(),
    notes_ko: z.string().optional(),
    notes_en: z.string().optional(),
    capacity: z.number().default(40),
    order: z.number().default(99),
  }),
});

export const collections = { team, news, mission_report, camp_schedules: camp_schedule };
