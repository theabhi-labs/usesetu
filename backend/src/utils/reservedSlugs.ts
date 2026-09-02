/**
 * Centralized list of reserved slugs across the UseSetu platform.
 * Subdomains matching any of these system keywords cannot be claimed by customer applications.
 */
export const RESERVED_SLUGS: readonly string[] = [
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'billing',
  'cdn',
  'dashboard',
  'demo',
  'dev',
  'docs',
  'domains',
  'health',
  'help',
  'images',
  'login',
  'mail',
  'platform',
  'portal',
  'prod',
  'public',
  'register',
  'root',
  'settings',
  'stage',
  'static',
  'status',
  'superadmin',
  'support',
  'test',
  'uploads',
  'usesetu',
  'www',
] as const;

export const RESERVED_SLUGS_SET = new Set<string>(RESERVED_SLUGS);

/**
 * Checks if a given slug is reserved by the system.
 */
export const isReservedSlug = (slug: string): boolean => {
  if (!slug) return false;
  return RESERVED_SLUGS_SET.has(slug.toLowerCase().trim());
};
