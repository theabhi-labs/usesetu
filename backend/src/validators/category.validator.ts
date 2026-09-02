import { z } from 'zod';

const preprocessBody = (body: any) => {
  if (!body) return body;
  const newBody = { ...body };

  // Coerce booleans
  ['isActive', 'showOnHomepage', 'isFeatured'].forEach((key) => {
    if (newBody[key] !== undefined) {
      if (newBody[key] === 'true' || newBody[key] === '1' || newBody[key] === true) newBody[key] = true;
      else if (newBody[key] === 'false' || newBody[key] === '0' || newBody[key] === false) newBody[key] = false;
    }
  });

  // Coerce numbers
  ['sortOrder'].forEach((key) => {
    if (newBody[key] !== undefined && typeof newBody[key] === 'string' && newBody[key].trim() !== '') {
      const num = Number(newBody[key]);
      if (!isNaN(num)) newBody[key] = num;
    }
  });

  // Reconstruct nested SEO object from flat FormData keys
  if (!newBody.seo) {
    const seo: any = {};
    if (newBody['seo[title]'] !== undefined) seo.title = newBody['seo[title]'];
    if (newBody['seo[description]'] !== undefined) seo.description = newBody['seo[description]'];
    if (newBody['seo[keywords][]'] !== undefined) {
      seo.keywords = Array.isArray(newBody['seo[keywords][]'])
        ? newBody['seo[keywords][]']
        : [newBody['seo[keywords][]']];
    } else {
      const keys = Object.keys(newBody).filter((k) => k.startsWith('seo[keywords]'));
      if (keys.length > 0) {
        seo.keywords = keys.map((k) => newBody[k]);
      }
    }
    if (Object.keys(seo).length > 0) {
      newBody.seo = seo;
    }
  }

  // Coerce parent empty string
  if (newBody.parent === '') {
    newBody.parent = null;
  }

  return newBody;
};

export const createCategorySchema = z.object({
  body: z.preprocess(preprocessBody, z.object({
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
  })),
});

export const updateCategorySchema = z.object({
  body: z.preprocess(preprocessBody, z.object({
    name: z.string().trim().min(2).max(150).optional(),
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
  })),
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
