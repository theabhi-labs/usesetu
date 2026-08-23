export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  icon?: string;
  banner?: { url: string; fileId: string };
  themeColor: string;
  description?: string;
  seo: { title?: string; description?: string; keywords?: string[] };
  sortOrder: number;
  isActive: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
}
