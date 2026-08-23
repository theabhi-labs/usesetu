import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { WebsiteSetting, MenuItem, Banner, Announcement, MediaAsset } from '../types/cms.types';

export const cmsApi = {
  getSettings: async (): Promise<WebsiteSetting> => {
    const res = await api.get<ApiResponse<WebsiteSetting>>('/cms/settings');
    return res.data.data;
  },

  updateSettings: async (data: Partial<WebsiteSetting>): Promise<WebsiteSetting> => {
    const res = await api.put<ApiResponse<WebsiteSetting>>('/cms/settings', data);
    return res.data.data;
  },

  toggleMaintenanceMode: async (body: { enabled: boolean; message?: string; estimatedTime?: string }): Promise<any> => {
    const res = await api.patch<ApiResponse<any>>('/cms/settings/maintenance', body);
    return res.data.data;
  },

  getMenu: async (location: 'header' | 'footer' | 'sidebar'): Promise<MenuItem[]> => {
    const res = await api.get<ApiResponse<any>>(`/cms/menus/${location}`);
    return res.data.data?.items || [];
  },

  saveMenu: async (location: 'header' | 'footer' | 'sidebar', items: MenuItem[]): Promise<any> => {
    const res = await api.put<ApiResponse<any>>(`/cms/menus`, { location, items });
    return res.data.data;
  },

  // Pages CRUD
  getPages: async (page = 1, limit = 100): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/cms/pages', { params: { page, limit } });
    return res.data.data;
  },

  getPublicPage: async (slug: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/cms/pages/public/${slug}`);
    return res.data.data;
  },

  createPage: async (data: any): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/cms/pages', data);
    return res.data.data;
  },

  updatePage: async (id: string, data: any): Promise<any> => {
    const res = await api.put<ApiResponse<any>>(`/cms/pages/${id}`, data);
    return res.data.data;
  },

  deletePage: async (id: string): Promise<void> => {
    await api.delete(`/cms/pages/${id}`);
  },

  // Banners CRUD
  getBanners: async (page = 1, limit = 100): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/cms/banners', { params: { page, limit } });
    return res.data.data;
  },

  getPublicBanners: async (): Promise<Banner[]> => {
    const res = await api.get<ApiResponse<Banner[]>>('/cms/banners/public');
    return res.data.data;
  },

  createBanner: async (formData: FormData): Promise<Banner> => {
    const res = await api.post<ApiResponse<Banner>>('/cms/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  updateBanner: async (id: string, formData: FormData): Promise<Banner> => {
    const res = await api.put<ApiResponse<Banner>>(`/cms/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  deleteBanner: async (id: string): Promise<void> => {
    await api.delete(`/cms/banners/${id}`);
  },

  // FAQs CRUD
  getFaqs: async (page = 1, limit = 100, params = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/cms/faqs', { params: { page, limit, ...params } });
    return res.data.data;
  },

  getPublicFaqs: async (params = {}): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/cms/faqs/public', { params });
    return res.data.data;
  },

  createFaq: async (data: any): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/cms/faqs', data);
    return res.data.data;
  },

  updateFaq: async (id: string, data: any): Promise<any> => {
    const res = await api.put<ApiResponse<any>>(`/cms/faqs/${id}`, data);
    return res.data.data;
  },

  deleteFaq: async (id: string): Promise<void> => {
    await api.delete(`/cms/faqs/${id}`);
  },

  // Announcements CRUD
  getAnnouncements: async (page = 1, limit = 100): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/cms/announcements', { params: { page, limit } });
    return res.data.data;
  },

  getPublicAnnouncements: async (): Promise<Announcement[]> => {
    const res = await api.get<ApiResponse<Announcement[]>>('/cms/announcements/public');
    return res.data.data;
  },

  createAnnouncement: async (data: any): Promise<Announcement> => {
    const res = await api.post<ApiResponse<Announcement>>('/cms/announcements', data);
    return res.data.data;
  },

  updateAnnouncement: async (id: string, data: any): Promise<Announcement> => {
    const res = await api.put<ApiResponse<Announcement>>(`/cms/announcements/${id}`, data);
    return res.data.data;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await api.delete(`/cms/announcements/${id}`);
  },

  // Media Library CRUD
  getMedia: async (page = 1, limit = 20, search = ''): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/cms/media', { params: { page, limit, search } });
    return res.data.data;
  },

  uploadMedia: async (formData: FormData): Promise<MediaAsset> => {
    const res = await api.post<ApiResponse<MediaAsset>>('/cms/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  deleteMedia: async (id: string): Promise<void> => {
    await api.delete(`/cms/media/${id}`);
  },
};
