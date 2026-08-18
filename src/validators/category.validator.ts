import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    parent: z.string().optional().nullable(),
    themeColor: z.string().optional(),
    description: z.string().max(2000).optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
    showOnHomepage: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: createCategorySchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const reorderCategoriesSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          sortOrder: z.number(),
        }),
      )
      .min(1),
  }),
});
