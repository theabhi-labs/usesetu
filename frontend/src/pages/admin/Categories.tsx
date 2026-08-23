import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../../services/category.api';
import type { Category } from '../../types/category.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Folder, Edit2, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

interface CategoryNode extends Category {
  children?: CategoryNode[];
}

export function Categories() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parent, setParent] = useState('');
  const [icon, setIcon] = useState('');
  const [themeColor, setThemeColor] = useState('#FF6700');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['adminCategories'],
    queryFn: () => categoryApi.getAll(1, 200),
  });

  const categoriesList: Category[] = categoriesQuery.data?.categories || [];

  // Live slug auto-generation
  useEffect(() => {
    if (!editingCategory) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [name, editingCategory]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (editingCategory) {
        return categoryApi.update(editingCategory._id, formData);
      } else {
        return categoryApi.create(formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.message || 'Cannot delete category with children.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => categoryApi.reorder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
  });

  const resetForm = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setParent('');
    setIcon('');
    setThemeColor('#FF6700');
    setDescription('');
    setIsActive(true);
    setShowOnHomepage(true);
    setIsFeatured(false);
    setSeoTitle('');
    setSeoDescription('');
    setSeoKeywords('');
    setBannerFile(null);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParent(cat.parent || '');
    setIcon(cat.icon || '');
    setThemeColor(cat.themeColor || '#FF6700');
    setDescription(cat.description || '');
    setIsActive(cat.isActive);
    setShowOnHomepage(cat.showOnHomepage);
    setIsFeatured(cat.isFeatured);
    setSeoTitle(cat.seo?.title || '');
    setSeoDescription(cat.seo?.description || '');
    setSeoKeywords(cat.seo?.keywords?.join(', ') || '');
    setBannerFile(null);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('parent', parent || '');
    formData.append('icon', icon);
    formData.append('themeColor', themeColor);
    formData.append('description', description);
    formData.append('isActive', String(isActive));
    formData.append('showOnHomepage', String(showOnHomepage));
    formData.append('isFeatured', String(isFeatured));
    formData.append('seo[title]', seoTitle);
    formData.append('seo[description]', seoDescription);
    const keywordsArray = seoKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    keywordsArray.forEach((k) => formData.append('seo[keywords][]', k));

    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    saveMutation.mutate(formData);
  };

  // Convert list to tree recursively
  const buildCategoryTree = (list: Category[]): CategoryNode[] => {
    const map: Record<string, CategoryNode> = {};
    const roots: CategoryNode[] = [];

    list.forEach((item) => {
      map[item._id] = { ...item, children: [] };
    });

    list.forEach((item) => {
      if (item.parent && map[item.parent]) {
        map[item.parent].children?.push(map[item._id]);
      } else {
        roots.push(map[item._id]);
      }
    });

    const sortNodes = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((n) => {
        if (n.children) sortNodes(n.children);
      });
    };

    sortNodes(roots);
    return roots;
  };

  const categoryTree = buildCategoryTree(categoriesList);

  const handleMove = (node: CategoryNode, direction: 'up' | 'down') => {
    // Find siblings
    const siblings = categoriesList.filter((c) => c.parent === node.parent).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((s) => s._id === node._id);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    // Swap sortOrders in the siblings list
    const updatedSiblings = [...siblings];
    const temp = updatedSiblings[index];
    updatedSiblings[index] = updatedSiblings[targetIdx];
    updatedSiblings[targetIdx] = temp;

    // Build the complete reordered id list
    const otherNodes = categoriesList.filter((c) => c.parent !== node.parent);
    const newFlatList = [...otherNodes, ...updatedSiblings];
    reorderMutation.mutate(newFlatList.map((c) => c._id));
  };

  // Recursive Tree Render Component
  const renderCategoryNode = (node: CategoryNode, index: number, totalSiblings: number) => {
    const isFirst = index === 0;
    const isLast = index === totalSiblings - 1;

    return (
      <div key={node._id} className="pl-6 border-l border-border relative select-none">
        <div className="absolute left-0 top-5 w-4 h-px bg-border" />
        <Card className="p-4 flex items-center justify-between gap-4 my-2 border-border/80 text-left bg-surface">
          <div className="flex items-center gap-2.5">
            <span className="text-base" style={{ color: node.themeColor || 'var(--color-accent)' }}>
              {node.icon || '📁'}
            </span>
            <div>
              <span className="font-bold text-sm text-text-primary">{node.name}</span>
              <span className="text-[10px] text-text-tertiary font-mono block">/{node.slug}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reorder Buttons */}
            <button
              disabled={isFirst}
              onClick={() => handleMove(node, 'up')}
              className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 hover:bg-surface-elevated rounded cursor-pointer"
            >
              <ArrowUp size={12} />
            </button>
            <button
              disabled={isLast}
              onClick={() => handleMove(node, 'down')}
              className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 hover:bg-surface-elevated rounded cursor-pointer"
            >
              <ArrowDown size={12} />
            </button>

            {/* Actions */}
            <button
              onClick={() => handleEdit(node)}
              className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => deleteMutation.mutate(node._id)}
              className="p-1.5 text-text-secondary hover:text-error hover:bg-surface-elevated rounded cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </Card>

        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child, idx) => renderCategoryNode(child, idx, node.children?.length || 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Categories Management</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Design hierarchy tree grids and customize theme colors.</p>
        </div>
        <Button size="sm" onClick={handleOpenCreateModal}>
          <Plus size={14} className="mr-1.5" /> New Category
        </Button>
      </div>

      {deleteError && (
        <div className="p-4 border border-error/20 bg-error/5 text-error rounded-md text-sm font-medium">
          {deleteError}
        </div>
      )}

      {categoriesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full animate-pulse" />
          <Skeleton className="h-16 w-full animate-pulse" />
        </div>
      ) : categoryTree.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg bg-surface">
          <Folder className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-sm text-text-secondary mb-4 select-none">No categories configured yet.</p>
          <Button size="sm" onClick={handleOpenCreateModal}>Create First Category</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryTree.map((root, idx) => renderCategoryNode(root, idx, categoryTree.length))}
        </div>
      )}

      {/* Save Category Dialog */}
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">Category Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">URL Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">Parent Category</label>
                <Select value={parent} onChange={(e) => setParent(e.target.value)}>
                  <option value="">None (Top Level)</option>
                  {categoriesList
                    .filter((c) => c._id !== editingCategory?._id)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">Icon (Emoji or text)</label>
                <Input placeholder="e.g. 📄" value={icon} onChange={(e) => setIcon(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">Theme Color</label>
                <div className="flex gap-2">
                  <Input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-12 h-9 p-0.5" />
                  <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="font-mono text-xs uppercase" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Banner Image Upload</label>
              <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} className="w-full text-xs text-text-secondary" />
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Checkbox id="isActive" label="Active Category" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <Checkbox id="showOnHomepage" label="Show on Homepage" checked={showOnHomepage} onChange={(e) => setShowOnHomepage(e.target.checked)} />
              <Checkbox id="isFeatured" label="Featured Category" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            </div>

            {/* SEO section */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-xs font-bold text-text-secondary uppercase select-none">SEO Optimization Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">SEO Title</label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">SEO Keywords (comma separated)</label>
                  <Input placeholder="passport, pan, csc" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary select-none">SEO Description</label>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
