import { useState, type FormEvent } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import {
  formatRupiah,
  type ColorMode,
  type PaperSize,
  type ServiceTariff,
  type TariffCategory,
} from '../shared/printLogic';
import { createServiceTariff, updateServiceTariff } from '../utils/api';

interface OperatorTariffManagerViewProps {
  tariffs: ServiceTariff[];
  onTariffsUpdated: (tariffs: ServiceTariff[]) => void;
}

export function OperatorTariffManagerView({
  tariffs,
  onTariffsUpdated,
}: OperatorTariffManagerViewProps) {
  const [editingId, setEditingId] = useState<number | 'new'>(() => tariffs[0]?.id ?? 'new');

  const initialSelected = tariffs[0];
  const [name, setName] = useState(initialSelected?.name ?? '');
  const [category, setCategory] = useState<TariffCategory>(initialSelected?.category ?? 'cetak');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>(initialSelected?.paperSize ?? 'A4');
  const [colorMode, setColorMode] = useState<'BW' | 'Color'>(initialSelected?.colorMode ?? 'BW');
  const [price, setPrice] = useState<string>(String(initialSelected?.price ?? 500));
  const [isActive, setIsActive] = useState<boolean>(initialSelected?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function selectTariff(tariff: ServiceTariff) {
    setEditingId(tariff.id);
    setName(tariff.name);
    setCategory(tariff.category);
    setPaperSize(tariff.paperSize ?? 'A4');
    setColorMode(tariff.colorMode ?? 'BW');
    setPrice(String(tariff.price));
    setIsActive(tariff.isActive);
    setError(null);
    setFeedback(null);
  }

  function startNewTariff() {
    setEditingId('new');
    setName('');
    setCategory('cetak');
    setPaperSize('A4');
    setColorMode('Color');
    setPrice('1500');
    setIsActive(true);
    setError(null);
    setFeedback(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const parsedPrice = Number.parseInt(price, 10);
    if (!name.trim() || name.trim().length < 2) {
      setError('Nama layanan minimal 2 karakter.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Tarif tidak boleh bernilai negatif.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      paperSize: (category === 'cetak' ? paperSize : null) as PaperSize,
      colorMode: (category === 'cetak' ? colorMode : null) as ColorMode,
      price: parsedPrice,
      isActive,
    };

    setSaving(true);
    try {
      const updatedList =
        editingId === 'new'
          ? await createServiceTariff(payload)
          : await updateServiceTariff(editingId, payload);
      onTariffsUpdated(updatedList);
      setFeedback(
        editingId === 'new'
          ? 'Layanan baru berhasil ditambahkan dan langsung aktif di halaman pelanggan.'
          : 'Perubahan tarif berhasil disimpan.'
      );
      if (editingId === 'new') {
        const last = updatedList[updatedList.length - 1];
        if (last) setEditingId(last.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan tarif.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
            Kelola tarif layanan
          </h1>
          <p className="text-sm text-slate-500">
            Tarif baru langsung dipakai pada pesanan berikutnya.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewTariff}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold inline-flex items-center gap-2 self-start sm:self-center whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Tambah layanan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Tariff Table */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Layanan</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Kertas</th>
                  <th className="py-3 px-3 text-right">Tarif</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tariffs.map((t) => {
                  const isSelected = editingId === t.id;
                  return (
                    <tr
                      key={t.id}
                      className={isSelected ? 'bg-[#FEFBE8]/80' : 'hover:bg-slate-50/60'}
                    >
                      <td className="py-3 px-4 font-semibold text-[#111827]">{t.name}</td>
                      <td className="py-3 px-3 text-slate-600 capitalize">{t.category}</td>
                      <td className="py-3 px-3 text-slate-600">{t.paperSize ?? '-'}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                        {formatRupiah(t.price)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => selectTariff(t)}
                          className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 bg-white hover:border-[#EA580C] text-xs font-semibold text-[#111827] cursor-pointer"
                        >
                          Ubah
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Edit / Create Panel */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#111827]">
            {editingId === 'new' ? 'Tambah layanan baru' : 'Ubah layanan'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="tariff-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama layanan
              </label>
              <input
                id="tariff-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Print warna A4"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tariff-category" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kategori
                </label>
                <select
                  id="tariff-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TariffCategory)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                >
                  <option value="cetak">Cetak</option>
                  <option value="jilid">Jilid</option>
                </select>
              </div>

              {category === 'cetak' && (
                <div>
                  <label htmlFor="tariff-paper" className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Kertas
                  </label>
                  <select
                    id="tariff-paper"
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                  >
                    <option value="A4">A4</option>
                    <option value="F4">F4</option>
                  </select>
                </div>
              )}
            </div>

            {category === 'cetak' && (
              <div>
                <label htmlFor="tariff-color" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Mode warna
                </label>
                <select
                  id="tariff-color"
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as 'BW' | 'Color')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#111827] focus:border-[#EA580C] focus:outline-none"
                >
                  <option value="BW">Hitam Putih</option>
                  <option value="Color">Warna</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tariff-price" className="block text-xs font-semibold text-slate-600 mb-1.5">
                {category === 'cetak' ? 'Tarif per halaman (Rp)' : 'Tarif jilid per rangkap (Rp)'}
              </label>
              <input
                id="tariff-price"
                type="number"
                min={0}
                step={100}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-semibold text-[#111827] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-[#111827] cursor-pointer py-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[#EA580C] rounded"
              />
              <span>Layanan tersedia</span>
            </label>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {feedback && (
              <p role="status" className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{feedback}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : editingId === 'new' ? 'Tambah layanan' : 'Simpan perubahan'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
