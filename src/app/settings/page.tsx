'use client';

import { useState } from 'react';
import { Plus, Pencil, Globe } from 'lucide-react';
import { getMarkets, addMarket, updateMarket } from '@/lib/data/markets';
import { getProducts } from '@/lib/data/products';
import { Market } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

const EMPTY_FORM = { code: '', name: '', currency: '', vatRate: '', regulatoryScheme: '' };

function validate(form: typeof EMPTY_FORM, isNew: boolean, existing: Market[]): string | null {
  if (!form.name.trim()) return 'Market name is required.';
  if (!form.currency.trim() || form.currency.trim().length !== 3) return 'Currency must be a 3-letter ISO code (e.g. GBP, EUR).';
  if (!form.regulatoryScheme.trim()) return 'Regulatory scheme is required.';
  const vat = parseFloat(form.vatRate);
  if (isNaN(vat) || vat < 0 || vat > 100) return 'VAT rate must be a number between 0 and 100.';
  if (isNew) {
    if (!form.code.trim() || form.code.trim().length < 2 || form.code.trim().length > 3) return 'Market code must be 2–3 characters.';
    if (existing.some((m) => m.code === form.code.trim().toUpperCase())) return `Market code "${form.code.toUpperCase()}" already exists.`;
  }
  return null;
}

export default function SettingsPage() {
  const [, forceUpdate] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Market | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const markets = getMarkets();

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowAddModal(true);
  }

  function openEdit(m: Market) {
    setForm({ code: m.code, name: m.name, currency: m.currency, vatRate: String(m.vatRate), regulatoryScheme: m.regulatoryScheme });
    setError(null);
    setEditTarget(m);
  }

  function closeModals() {
    setShowAddModal(false);
    setEditTarget(null);
    setError(null);
  }

  function handleAdd() {
    const err = validate(form, true, markets);
    if (err) { setError(err); return; }
    addMarket({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      currency: form.currency.trim().toUpperCase(),
      vatRate: parseFloat(form.vatRate),
      regulatoryScheme: form.regulatoryScheme.trim(),
    });
    closeModals();
    forceUpdate((n) => n + 1);
  }

  function handleEdit() {
    if (!editTarget) return;
    const err = validate(form, false, markets);
    if (err) { setError(err); return; }
    updateMarket(editTarget.code, {
      name: form.name.trim(),
      currency: form.currency.trim().toUpperCase(),
      vatRate: parseFloat(form.vatRate),
      regulatoryScheme: form.regulatoryScheme.trim(),
    });
    closeModals();
    forceUpdate((n) => n + 1);
  }

  const isAddValid = form.code.trim().length >= 2 && form.name.trim() && form.currency.trim().length === 3 && form.regulatoryScheme.trim() && form.vatRate !== '';
  const isEditValid = form.name.trim() && form.currency.trim().length === 3 && form.regulatoryScheme.trim() && form.vatRate !== '';

  return (
    <div className="w-full space-y-6">
      {/* Page header */}
      <div>
        <h2 className="section-title">Settings</h2>
        <p className="section-subtitle">Platform configuration and administration</p>
      </div>

      {/* Markets section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={15} style={{ color: 'var(--text-tertiary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Markets
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {markets.length} configured
            </span>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus size={13} /> Add Market
          </Button>
        </div>

        <Card padding={false}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Currency</th>
                <th>VAT Rate</th>
                <th>Regulatory Scheme</th>
                <th>Products</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                const productCount = getProducts({ market: m.code }).length;
                return (
                  <tr key={m.code}>
                    <td>
                      <span className="cell-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{m.code}</span>
                    </td>
                    <td className="cell-primary">{m.name}</td>
                    <td>
                      <span className="cell-mono">{m.currency}</span>
                    </td>
                    <td>{m.vatRate}%</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.regulatoryScheme}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{productCount}</td>
                    <td>
                      <button
                        onClick={() => openEdit(m)}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: 'var(--text-tertiary)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-primary)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Markets added here are immediately available in the quote builder, product catalogue, and pricing rules. Add products for a new market to start quoting.
        </p>
      </section>

      {/* Add modal */}
      <Modal open={showAddModal} onClose={closeModals} title="Add Market">
        <MarketForm form={form} setForm={setForm} isNew error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={closeModals}>Cancel</Button>
          <Button size="sm" onClick={handleAdd} disabled={!isAddValid}>Add Market</Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={closeModals} title={`Edit Market — ${editTarget?.code}`}>
        <MarketForm form={form} setForm={setForm} isNew={false} error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={closeModals}>Cancel</Button>
          <Button size="sm" onClick={handleEdit} disabled={!isEditValid}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
}

interface MarketFormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  isNew: boolean;
  error: string | null;
}

function MarketForm({ form, setForm, isNew, error }: MarketFormProps) {
  function field(key: keyof typeof EMPTY_FORM, transform?: (v: string) => string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = transform ? transform(e.target.value) : e.target.value;
      setForm((f) => ({ ...f, [key]: val }));
    };
  }

  return (
    <div className="space-y-3">
      {isNew && (
        <div>
          <label className="field-label">Market Code</label>
          <input
            className="field-input"
            placeholder="e.g. DE"
            maxLength={3}
            value={form.code}
            onChange={field('code', (v) => v.toUpperCase())}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>2–3 character ISO country code. Cannot be changed after creation.</p>
        </div>
      )}
      <div>
        <label className="field-label">Market Name</label>
        <input className="field-input" placeholder="e.g. Germany" value={form.name} onChange={field('name')} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="field-label">Currency</label>
          <input
            className="field-input"
            placeholder="e.g. EUR"
            maxLength={3}
            value={form.currency}
            onChange={field('currency', (v) => v.toUpperCase())}
          />
        </div>
        <div className="flex-1">
          <label className="field-label">VAT Rate (%)</label>
          <input className="field-input" type="number" min={0} max={100} step={0.1} placeholder="e.g. 19" value={form.vatRate} onChange={field('vatRate')} />
        </div>
      </div>
      <div>
        <label className="field-label">Regulatory Scheme</label>
        <input className="field-input" placeholder="e.g. BNetzA" value={form.regulatoryScheme} onChange={field('regulatoryScheme')} />
      </div>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
      )}
    </div>
  );
}
