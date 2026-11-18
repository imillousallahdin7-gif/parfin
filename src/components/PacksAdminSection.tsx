import React, { useState } from 'react';
import { Edit2, Eye, EyeOff, Plus, Trash2, Upload, X } from 'lucide-react';
import { Pack } from '../types/catalog';
import { formatMAD } from '../utils/format';
import { uploadAdminImage } from '../services/catalogService';
import { deleteAdminPack, saveAdminPack, toggleAdminPackActive } from '../services/packService';

interface PacksAdminSectionProps {
  packs: Pack[];
  onMutated: (message: string) => void;
}

interface PackFormState {
  id?: string;
  category: 'women' | 'men';
  nameFr: string;
  descFr: string;
  price: string;
  active: boolean;
  imageUrl?: string;
  imageData?: string;
}

export const PacksAdminSection: React.FC<PacksAdminSectionProps> = ({ packs, onMutated }) => {
  const [subTab, setSubTab] = useState<'women' | 'men'>('women');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pack | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PackFormState>({
    category: 'women',
    nameFr: '',
    descFr: '',
    price: '',
    active: true,
  });

  const filteredPacks = packs.filter((p) => p.category === subTab);

  const openCreate = () => {
    setError(null);
    setForm({
      category: subTab,
      nameFr: '',
      descFr: '',
      price: '',
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (pack: Pack) => {
    setError(null);
    setForm({
      id: pack.id,
      category: pack.category,
      nameFr: pack.name?.fr || '',
      descFr: pack.description?.fr || '',
      price: String(pack.price ?? 0),
      active: pack.active,
      imageUrl: pack.imageUrl,
      imageData: pack.imageData,
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadAdminImage(file, 'packs', form.id || `pack_${Date.now()}`);
      setForm((prev) => ({
        ...prev,
        imageUrl: res.imageUrl ?? '',
        imageData: res.imageData,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الصورة.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nameFr.trim()) {
      setError('يرجى إدخال اسم الباقة باللغة الفرنسية.');
      return;
    }

    const numericPrice = Number(form.price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('يرجى إدخال سعر صحيح بالدرهم.');
      return;
    }

    setSaving(true);
    try {
      await saveAdminPack({
        id: form.id,
        category: form.category,
        name: { fr: form.nameFr.trim(), ar: '' },
        description: { fr: form.descFr.trim(), ar: '' },
        price: numericPrice,
        active: form.active,
        imageUrl: form.imageUrl,
        imageData: form.imageData,
      });
      setModalOpen(false);
      onMutated(
        form.id
          ? 'تم حفظ وتحديث الباقة مباشرة في المتجر.'
          : 'تم حفظ الباقة الجديدة ونشرها مباشرة في المتجر.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (pack: Pack) => {
    try {
      await toggleAdminPackActive(pack.id, !pack.active);
      onMutated(`تم ${!pack.active ? 'إظهار' : 'إخفاء'} الباقة "${pack.name?.fr}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التحديث.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteAdminPack(deleteTarget.id);
      const deletedName = deleteTarget.name?.fr || 'الباقة';
      setDeleteTarget(null);
      onMutated(`تم حذف الباقة "${deletedName}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Sub-tabs + Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('women')}
            className={`px-4 py-2.5 text-xs font-medium border min-h-[44px] transition-colors ${
              subTab === 'women'
                ? 'bg-[#0B0A08] text-[#E8D08C] border-[#C9A24D]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D]'
            }`}
          >
            باقات النساء ({packs.filter((p) => p.category === 'women').length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('men')}
            className={`px-4 py-2.5 text-xs font-medium border min-h-[44px] transition-colors ${
              subTab === 'men'
                ? 'bg-[#0B0A08] text-[#E8D08C] border-[#C9A24D]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D]'
            }`}
          >
            باقات الرجال ({packs.filter((p) => p.category === 'men').length})
          </button>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="btn-primary-wipe px-5 py-2.5 text-xs font-medium inline-flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة باقة جديدة</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}

      {filteredPacks.length === 0 ? (
        <div className="bg-[#FDFCFA] border border-[#DDD3BE] p-10 text-center">
          <p className="font-display text-xl text-[#0B0A08] mb-2">
            لا توجد باقات في قسم {subTab === 'women' ? 'باقات النساء' : 'باقات الرجال'}
          </p>
          <p className="text-xs text-[#8C857B] mb-5">
            أنشئ أول باقة لعرضها في هذا القسم داخل المتجر.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="btn-secondary-invert px-5 py-2.5 text-xs font-medium"
          >
            إنشاء باقة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPacks.map((pack) => {
            const img = pack.imageUrl || pack.imageData;
            return (
              <div
                key={pack.id}
                className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#EAE4DC] relative overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={pack.name?.fr || 'Pack'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#8C857B]">
                      بدون صورة
                    </div>
                  )}
                  <span
                    className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      pack.active
                        ? 'bg-[#0B0A08] text-[#E8D08C]'
                        : 'bg-[#EAE4DC] text-[#8C857B]'
                    }`}
                  >
                    {pack.active ? 'ظاهر' : 'مخفي'}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display text-lg font-semibold text-[#0B0A08] line-clamp-1" dir="ltr">
                    {pack.name?.fr}
                  </h3>
                  <p className="text-xs text-[#8C857B] mt-1 line-clamp-2 min-h-[2rem]" dir="ltr">
                    {pack.description?.fr || 'Sans description'}
                  </p>
                  <p className="text-sm font-semibold text-[#8F6E2E] mt-2 tabular-nums" dir="ltr">
                    {formatMAD(pack.price)}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#DDD3BE] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(pack)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-[#DDD3BE] hover:border-[#0B0A08] transition-colors"
                    >
                      {pack.active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>إخفاء</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>إظهار</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(pack)}
                        aria-label={`تعديل ${pack.name?.fr}`}
                        title="تعديل"
                        className="w-9 h-9 flex items-center justify-center border border-[#DDD3BE] hover:border-[#C9A24D] text-[#0B0A08]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(pack)}
                        aria-label={`حذف ${pack.name?.fr}`}
                        title="حذف"
                        className="w-9 h-9 flex items-center justify-center border border-[#DDD3BE] hover:border-red-600 text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Pack Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B0A08]/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl w-full max-w-xl max-h-[92dvh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD3BE]">
              <h3 className="font-display text-2xl font-semibold text-[#0B0A08]">
                {form.id ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-full border border-[#DDD3BE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">قسم الباقة *</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as 'women' | 'men' }))
                  }
                  className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                >
                  <option value="women">باقات النساء</option>
                  <option value="men">باقات الرجال</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  اسم الباقة (بالفرنسية فقط) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={form.nameFr}
                  onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                  placeholder="Ex. Pack Découverte Homme"
                  className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  وصف الباقة (بالفرنسية فقط)
                </label>
                <textarea
                  rows={3}
                  dir="ltr"
                  value={form.descFr}
                  onChange={(e) => setForm((f) => ({ ...f, descFr: e.target.value }))}
                  placeholder="Description du pack en français..."
                  className="w-full p-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">السعر (بالدرهم DH) *</label>
                  <input
                    type="number"
                    dir="ltr"
                    min="0"
                    step="1"
                    required
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm tabular-nums"
                  />
                </div>
                <label className="flex items-center gap-2.5 min-h-[44px] px-3 border border-[#DDD3BE] bg-[#F6F1E7] cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="accent-[#0B0A08] w-4 h-4"
                  />
                  <span>ظاهر في المتجر</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">صورة الباقة</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#0B0A08] text-xs font-medium cursor-pointer hover:bg-[#0B0A08] hover:text-[#F6F1E7] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? 'جاري ضغط الصورة...' : 'اختيار صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {(form.imageUrl || form.imageData) && (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={form.imageUrl || form.imageData}
                        alt="معاينة الصورة"
                        className="w-12 h-14 object-cover border border-[#DDD3BE]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, imageUrl: '', imageData: '' }))
                        }
                        className="text-[11px] text-red-700 hover:underline"
                      >
                        إزالة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#DDD3BE] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-[#DDD3BE] text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn-primary-wipe px-6 py-2.5 text-xs font-medium disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ الباقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B0A08]/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl w-full max-w-md p-6">
            <h3 className="font-display text-xl font-semibold text-[#0B0A08] mb-2">
              تأكيد الحذف
            </h3>
            <p className="text-sm text-[#8C857B] mb-6">
              هل تريد فعلاً حذف الباقة « <span dir="ltr">{deleteTarget.name?.fr}</span> »؟ لا يمكن
              التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#DDD3BE] text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="px-5 py-2 bg-red-700 text-white text-xs font-medium hover:bg-red-800"
              >
                {saving ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
