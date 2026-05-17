import { useState, useMemo, useEffect, useRef } from 'react';
import { useItems } from '../../context/ItemsContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiGetTransactions } from '../../utils/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Calculator, TrendingUp, Tag, AlertTriangle, BookOpen, Search, XCircle } from 'lucide-react';
import AnalyticsGuide from '../../components/AnalyticsGuide';

// ─── Math ───────────────────────────────────────────────────────────────────
const ZL: Record<string, number> = { '90%': 1.28, '95%': 1.645, '99%': 2.326 };
function eoq(D: number, S: number, H: number) { return Math.sqrt(2 * D * S / H); }
function epq(D: number, S: number, H: number, P: number) { return Math.sqrt(2 * D * S / H * P / (P - D)); }
function rop(d: number, L: number, z: number, σ: number) { return d * L + z * σ * Math.sqrt(L); }
function ss(z: number, σ: number, L: number) { return z * σ * Math.sqrt(L); }
function ssExt(z: number, σd: number, d: number, σL: number, L: number) {
  return z * Math.sqrt(L * σd ** 2 + d ** 2 * σL ** 2);
}
function sma(data: number[], n: number) {
  return data.map((_, i) => i < n - 1 ? null : data.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n);
}
function ses(data: number[], α: number) {
  const r = [data[0]];
  for (let i = 1; i < data.length; i++) r.push(+(α * data[i - 1] + (1 - α) * r[i - 1]).toFixed(1));
  return r;
}
function holt(data: number[], α: number, β: number, steps: number) {
  let L = data[0], T = data[1] - data[0];
  const smoothed: (number | null)[] = [null];
  for (let i = 1; i < data.length; i++) {
    const Lp = L;
    L = α * data[i] + (1 - α) * (L + T);
    T = β * (L - Lp) + (1 - β) * T;
    smoothed.push(+(L + T).toFixed(1));
  }
  const fc = Array.from({ length: steps }, (_, i) => +(L + (i + 1) * T).toFixed(1));
  return { smoothed, fc };
}
function linReg(data: number[]) {
  const n = data.length;
  const Σx = n * (n + 1) / 2, Σy = data.reduce((a, b) => a + b, 0);
  const Σxy = data.reduce((s, y, i) => s + (i + 1) * y, 0);
  const Σx2 = n * (n + 1) * (2 * n + 1) / 6;
  const b = (n * Σxy - Σx * Σy) / (n * Σx2 - Σx ** 2);
  const a = (Σy - b * Σx) / n;
  const ŷ = data.map((_, i) => +(a + b * (i + 1)).toFixed(1));
  const ȳ = Σy / n;
  const R2 = +(1 - data.reduce((s, y, i) => s + (y - ŷ[i]) ** 2, 0) /
    Math.max(data.reduce((s, y) => s + (y - ȳ) ** 2, 0), 1e-10)).toFixed(3);
  return { a: +a.toFixed(2), b: +b.toFixed(2), ŷ, R2 };
}
function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
function poissonPMF(k: number, λ: number) { return (λ ** k * Math.exp(-λ)) / fact(Math.min(k, 20)); }
function poissonCDF(s: number, λ: number) {
  let c = 0; for (let k = 0; k <= s; k++) c += poissonPMF(k, λ); return Math.min(c, 1);
}

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTHS_UA = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ABC_COL: Record<string, string> = { A: '#3b82f6', B: '#f59e0b', C: '#9ca3af' };
const XYZ_COL: Record<string, string> = { X: '#22c55e', Y: '#f59e0b', Z: '#ef4444' };
const CI_COL: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', normal: '#22c55e' };

// ─── UI helpers ─────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type="number" value={value} step={step} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Card({ num, title, formula, children }: { num: number; title: string; formula: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{num}</span>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <p className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded mb-4">{formula}</p>
      {children}
    </div>
  );
}
function Res({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${color ?? 'text-blue-700'}`}>{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { items } = useItems();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<'opt' | 'forecast' | 'class' | 'risk'>('opt');
  const [showGuide, setShowGuide] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    apiGetTransactions()
      .then(data => setTransactions(data))
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, []);

  // Optimization state
  const [D, setD] = useState('');
  const [S, setS] = useState('500');
  const [H, setH] = useState('120');
  const [P, setP] = useState('5000');
  const [rD, setRD] = useState('');
  const [rL, setRL] = useState('7');
  const [rSl, setRSl] = useState('95%');
  const [rSig, setRSig] = useState('3');
  const [sL, setSL] = useState('7');
  const [sSl, setSSl] = useState('95%');
  const [sSig, setSSig] = useState('3');
  const [sDd, setSDd] = useState('');
  const [sSigL, setSSigL] = useState('1');
  const [optItemId, setOptItemId] = useState('');

  // Forecast state
  const [raw, setRaw] = useState('');
  const [demandLabels, setDemandLabels] = useState<string[]>([]);
  const txAutoFilledRef = useRef(false); // prevent overwriting manual edits
  const [smaN, setSmaN] = useState('3');
  const [sesA, setSesA] = useState('0.3');
  const [hA, setHA] = useState('0.3');
  const [hB, setHB] = useState('0.2');
  const [hM, setHM] = useState('3');

  // Risk state
  const [lam, setLam] = useState('');
  const [stk, setStk] = useState('');
  const [w1, setW1] = useState('0.4');
  const [w2, setW2] = useState('0.35');
  const [w3, setW3] = useState('0.25');
  const [poisItemId, setPoisItemId] = useState('');

  // Search / combobox state
  const [optSearch,    setOptSearch]    = useState('');
  const [optDropOpen,  setOptDropOpen]  = useState(false);
  const [poisSearch,   setPoisSearch]   = useState('');
  const [poisDropOpen, setPoisDropOpen] = useState(false);
  const [abcSearch,    setAbcSearch]    = useState('');
  const [xyzSearch,    setXyzSearch]    = useState('');
  const [ciSearch,     setCiSearch]     = useState('');

  // ─── Aggregate: monthly demand (out + write_off) ─────────────────────────
  const realMonthly = useMemo(() => {
    const monthNames = language === 'en' ? MONTHS_EN : MONTHS_UA;
    const out = transactions.filter(tx => tx.type === 'out' || tx.type === 'write_off');
    if (!out.length) return [];
    const map: Record<string, number> = {};
    out.forEach(tx => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[k] = (map[k] ?? 0) + (tx.quantity ?? 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, qty]) => {
        const [yr, mo] = k.split('-');
        return { label: `${monthNames[+mo - 1]} ${yr}`, qty: Math.round(qty) };
      });
  }, [transactions, language]);

  // ─── Per-item total demand map ────────────────────────────────────────────
  const itemDemandMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'out' || tx.type === 'write_off')
      .forEach(tx => {
        if (!tx.item_id) return;
        map[tx.item_id] = (map[tx.item_id] ?? 0) + (tx.quantity ?? 0);
      });
    return map;
  }, [transactions]);

  // Auto-populate forecast from real transactions — only once on first load,
  // never overwriting values the user typed manually
  useEffect(() => {
    if (realMonthly.length >= 3 && !txAutoFilledRef.current) {
      txAutoFilledRef.current = true;
      setRaw(realMonthly.map(m => m.qty).join(','));
      setDemandLabels(realMonthly.map(m => m.label));
    }
  }, [realMonthly]);

  // Auto-fill D / d when optimization item selected
  useEffect(() => {
    if (!optItemId) return;
    const total = itemDemandMap[optItemId] ?? 0;
    if (total > 0) {
      setD(String(Math.round(total)));
      const daily = +(total / 365).toFixed(2);
      setRD(String(daily));
      setSDd(String(daily));
    }
  }, [optItemId, itemDemandMap]);

  // Auto-fill λ + s for Poisson
  useEffect(() => {
    if (poisItemId) {
      const itemTxs = transactions.filter(
        tx => (tx.type === 'out' || tx.type === 'write_off') && tx.item_id === poisItemId
      );
      const monthSet = new Set(itemTxs.map(tx => {
        const d = new Date(tx.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }));
      const months = Math.max(monthSet.size, 1);
      const total = itemDemandMap[poisItemId] ?? 0;
      if (total > 0) setLam((total / months).toFixed(1));
      const item = items.find(i => i._id === poisItemId);
      if (item) setStk(String(Math.round(item.current_stock)));
    } else if (realMonthly.length > 0) {
      const avg = realMonthly.reduce((s, m) => s + m.qty, 0) / realMonthly.length;
      if (avg > 0) setLam(avg.toFixed(1));
    }
  }, [poisItemId, itemDemandMap, realMonthly, transactions, items]);

  // ─── Optimization results ─────────────────────────────────────────────────
  const eoqR = useMemo(() => {
    const d = +D, s = +S, h = +H;
    if (!d || !s || !h) return null;
    const Q = eoq(d, s, h);
    return { Q: +Q.toFixed(1), TC: +(d / Q * s + Q / 2 * h).toFixed(2), orders: +(d / Q).toFixed(1) };
  }, [D, S, H]);

  const epqR = useMemo(() => {
    const d = +D, s = +S, h = +H, p = +P;
    if (!d || !s || !h || !p || p <= d) return null;
    const Q = epq(d, s, h, p);
    const Imax = Q * (1 - d / p);
    return { Q: +Q.toFixed(1), Imax: +Imax.toFixed(1), TC: +(d / Q * s + Imax / 2 * h).toFixed(2) };
  }, [D, S, H, P]);

  const ropR = useMemo(() => {
    const d = +rD, l = +rL, z = ZL[rSl], sig = +rSig;
    if (!d || !l || !sig) return null;
    return { ROP: +rop(d, l, z, sig).toFixed(1), DL: +(d * l).toFixed(1), SS: +ss(z, sig, l).toFixed(1) };
  }, [rD, rL, rSl, rSig]);

  const ssR = useMemo(() => {
    const z = ZL[sSl], sig = +sSig, l = +sL, d = +sDd, sigL = +sSigL;
    if (!sig || !l) return null;
    return { basic: +ss(z, sig, l).toFixed(1), ext: +ssExt(z, sig, d, sigL, l).toFixed(1) };
  }, [sL, sSl, sSig, sDd, sSigL]);

  // ─── Forecast results ─────────────────────────────────────────────────────
  const demand = useMemo(() =>
    raw.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0), [raw]);

  const lrR = useMemo(() => demand.length >= 3 ? linReg(demand) : null, [demand]);

  const chartData = useMemo(() => {
    if (demand.length < 3) return [];
    const n = Math.max(2, Math.min(+smaN || 3, demand.length - 1));
    const α = Math.min(0.99, Math.max(0.01, +sesA || 0.3));
    const ha = Math.min(0.99, Math.max(0.01, +hA || 0.3));
    const hb = Math.min(0.99, Math.max(0.01, +hB || 0.2));
    const hm = Math.max(1, Math.min(6, +hM || 3));
    const smaV = sma(demand, n);
    const sesV = ses(demand, α);
    const { smoothed, fc } = holt(demand, ha, hb, hm);
    const { ŷ } = lrR ?? linReg(demand);
    const base = demand.map((actual, i) => ({
      p: demandLabels[i] ?? `P${i + 1}`, actual,
      sma: smaV[i] ?? undefined,
      ses: sesV[i],
      holt: smoothed[i] ?? undefined,
      reg: ŷ[i],
    }));
    fc.forEach((v, i) => base.push({
      p: `+${i + 1}`, actual: undefined as any,
      sma: undefined, ses: undefined as any, holt: v, reg: undefined as any,
    }));
    return base;
  }, [demand, smaN, sesA, hA, hB, hM, lrR, demandLabels]);

  // ─── ABC ─────────────────────────────────────────────────────────────────
  const abcR = useMemo(() => {
    const avail = items.filter(i => i.status === 'available' && i.current_stock > 0);
    if (!avail.length) return [];
    const total = avail.reduce((s, i) => s + i.current_stock * i.unit_price, 0);
    if (!total) return [];
    const sorted = [...avail].sort((a, b) => b.current_stock * b.unit_price - a.current_stock * a.unit_price);
    let cum = 0;
    return sorted.slice(0, 15).map((item, i) => {
      const val = item.current_stock * item.unit_price;
      cum += val;
      const pct = cum / total * 100;
      return { rank: i + 1, name: item.name.slice(0, 22), value: +val.toFixed(0), pct: +pct.toFixed(1), class: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' };
    });
  }, [items]);

  // ─── XYZ ─────────────────────────────────────────────────────────────────
  const xyzR = useMemo(() => {
    return items.filter(i => i.status === 'available').slice(0, 15).map(item => {
      const txs = transactions.filter(
        tx => (tx.type === 'out' || tx.type === 'write_off') && tx.item_id === item._id
      );
      if (txs.length < 2) {
        return { name: item.name.slice(0, 20), cv: null as number | null, mean: null as number | null, class: 'Z' as const, noData: true };
      }
      const monthMap: Record<string, number> = {};
      txs.forEach(tx => {
        if (!tx.date) return;
        const d = new Date(tx.date);
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        monthMap[k] = (monthMap[k] ?? 0) + (tx.quantity ?? 0);
      });
      const vals = Object.values(monthMap);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const σ = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
      const cv = mean > 0 ? σ / mean : 0;
      return {
        name: item.name.slice(0, 20),
        cv: +cv.toFixed(3),
        mean: +mean.toFixed(1),
        class: (cv <= 0.1 ? 'X' : cv <= 0.25 ? 'Y' : 'Z') as 'X' | 'Y' | 'Z',
        noData: false,
      };
    });
  }, [items, transactions]);

  // ─── Poisson ─────────────────────────────────────────────────────────────
  const poisR = useMemo(() => {
    const λ = Math.max(0.1, +lam || 1);
    const s = Math.max(0, Math.min(50, +stk || 0));
    const dist = Array.from({ length: Math.min(20, Math.ceil(λ * 3) + 2) }, (_, k) => ({
      k, prob: +(poissonPMF(k, λ) * 100).toFixed(2),
    }));
    return { dist, pSvc: +(poissonCDF(s, λ) * 100).toFixed(2), pDef: +((1 - poissonCDF(s, λ)) * 100).toFixed(2) };
  }, [lam, stk]);

  // ─── Criticality Index ────────────────────────────────────────────────────
  const ciR = useMemo(() => {
    const avail = items.filter(i => i.status === 'available');
    if (!avail.length) return [];
    const prices = avail.map(i => i.unit_price);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const pw1 = Math.max(0, +w1 || 0.4), pw2 = Math.max(0, +w2 || 0.35), pw3 = Math.max(0, +w3 || 0.25);
    return avail.slice(0, 10).map(item => {
      const sr = item.current_stock / Math.max(item.min_stock, 1);
      const dc = maxP > minP ? (item.unit_price - minP) / (maxP - minP) : 0.5;
      const ci = pw1 * Math.min(1 / Math.max(sr, 0.1), 3) / 3 + pw2 * dc + pw3 * 0.5;
      const ciN = +Math.min(ci, 1).toFixed(3);
      // Use language-neutral keys for CI_COL lookup
      return { name: item.name.slice(0, 22), ci: ciN, level: ciN > 0.7 ? 'critical' : ciN > 0.4 ? 'high' : 'normal', sr: +sr.toFixed(2) };
    }).sort((a, b) => b.ci - a.ci);
  }, [items, w1, w2, w3]);

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'opt',      label: t('analytics.tab.opt'),      icon: <Calculator size={15} /> },
    { id: 'forecast', label: t('analytics.tab.forecast'),  icon: <TrendingUp size={15} /> },
    { id: 'class',    label: t('analytics.tab.class'),     icon: <Tag size={15} /> },
    { id: 'risk',     label: t('analytics.tab.risk'),      icon: <AlertTriangle size={15} /> },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {showGuide && <AnalyticsGuide onClose={() => setShowGuide(false)} />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{t('analytics.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0"
        >
          <BookOpen size={16} />
          {t('analytics.btn.guide')}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(tab_ => (
          <button key={tab_.id} onClick={() => setTab(tab_.id as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === tab_.id ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab_.icon}{tab_.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: OPTIMIZATION ══ */}
      {tab === 'opt' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-800">{t('analytics.opt.autoFill.label')}</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={optSearch !== '' || optDropOpen ? optSearch : (items.find(i => i._id === optItemId)?.name ?? '')}
                onChange={e => { setOptSearch(e.target.value); setOptItemId(''); setOptDropOpen(true); }}
                onFocus={() => { setOptSearch(''); setOptDropOpen(true); }}
                onBlur={() => setTimeout(() => setOptDropOpen(false), 150)}
                placeholder={t('analytics.opt.autoFill.manual')}
                className="w-full pl-8 pr-8 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(optItemId || optSearch) && (
                <button
                  onMouseDown={e => { e.preventDefault(); setOptItemId(''); setOptSearch(''); setOptDropOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                ><XCircle size={14} /></button>
              )}
              {optDropOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {items
                    .filter(item => !optSearch.trim() ||
                      item.name.toLowerCase().includes(optSearch.toLowerCase()) ||
                      item.sku.toLowerCase().includes(optSearch.toLowerCase()))
                    .map(item => (
                      <button
                        key={item._id}
                        onMouseDown={e => { e.preventDefault(); setOptItemId(item._id); setOptSearch(''); setOptDropOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${optItemId === item._id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                      >
                        <span>{item.name}</span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {item.sku} · {t('analytics.opt.issued')} {Math.round(itemDemandMap[item._id] ?? 0)} {language === 'en' ? 'units' : 'од.'}
                        </span>
                      </button>
                    ))}
                  {items.filter(item => !optSearch.trim() ||
                    item.name.toLowerCase().includes(optSearch.toLowerCase()) ||
                    item.sku.toLowerCase().includes(optSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400">Нічого не знайдено</p>
                  )}
                </div>
              )}
            </div>
            {optItemId && (
              <p className="text-xs text-blue-700">
                D = <strong>{Math.round(itemDemandMap[optItemId] ?? 0)} {language === 'en' ? 'units' : 'од.'}</strong> ·
                d = <strong>{((itemDemandMap[optItemId] ?? 0) / 365).toFixed(2)} {language === 'en' ? 'units/day' : 'од/день'}</strong>
              </p>
            )}
            <p className="text-xs text-blue-600">{t('analytics.opt.autoFill.hint')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* #1 EOQ */}
            <Card num={1} title={t('analytics.opt.eoq.title')} formula="Q* = √(2·D·S / H)">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Inp label={t('analytics.opt.eoq.D')} value={D} onChange={setD} />
                <Inp label={t('analytics.opt.eoq.S')} value={S} onChange={setS} />
                <Inp label={t('analytics.opt.eoq.H')} value={H} onChange={setH} />
              </div>
              {eoqR ? (
                <div className="bg-blue-50 rounded-xl p-3 space-y-0.5">
                  <Res label={t('analytics.opt.eoq.Q')} value={eoqR.Q} unit={language === 'en' ? 'units' : 'од.'} />
                  <Res label={t('analytics.opt.eoq.orders')} value={eoqR.orders} />
                  <Res label={t('analytics.opt.eoq.TC')} value={`₴${eoqR.TC.toLocaleString()}`} />
                </div>
              ) : <p className="text-xs text-gray-400">{t('analytics.opt.eoq.empty')}</p>}
            </Card>

            {/* #2 EPQ */}
            <Card num={2} title={t('analytics.opt.epq.title')} formula="EPQ = √(2DS/H · P/(P−D))">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Inp label={t('analytics.opt.eoq.D')} value={D} onChange={setD} />
                <Inp label={t('analytics.opt.eoq.S')} value={S} onChange={setS} />
                <Inp label={t('analytics.opt.eoq.H')} value={H} onChange={setH} />
                <Inp label={t('analytics.opt.epq.P')} value={P} onChange={setP} />
              </div>
              {epqR ? (
                <div className="bg-blue-50 rounded-xl p-3 space-y-0.5">
                  <Res label={t('analytics.opt.epq.Q')} value={epqR.Q} unit={language === 'en' ? 'units' : 'од.'} />
                  <Res label={t('analytics.opt.epq.Imax')} value={epqR.Imax} unit={language === 'en' ? 'units' : 'од.'} />
                  <Res label={t('analytics.opt.epq.TC')} value={`₴${epqR.TC.toLocaleString()}`} />
                </div>
              ) : <p className="text-xs text-gray-400 mt-2">{+P > 0 && +D > 0 && +P <= +D ? t('analytics.opt.epq.Perror') : t('analytics.opt.epq.empty')}</p>}
            </Card>

            {/* #3 ROP */}
            <Card num={3} title={t('analytics.opt.rop.title')} formula="ROP = d·L + Z·σ·√L">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Inp label={t('analytics.opt.rop.d')} value={rD} onChange={setRD} />
                <Inp label={t('analytics.opt.rop.L')} value={rL} onChange={setRL} />
                <Inp label={t('analytics.opt.rop.sig')} value={rSig} onChange={setRSig} />
                <Sel label={t('analytics.opt.rop.sl')} value={rSl} onChange={setRSl} opts={['90%','95%','99%']} />
              </div>
              {ropR ? (
                <div className="bg-blue-50 rounded-xl p-3 space-y-0.5">
                  <Res label={t('analytics.opt.rop.ROP')} value={ropR.ROP} unit={language === 'en' ? 'units' : 'од.'} color="text-red-600" />
                  <Res label={t('analytics.opt.rop.DL')} value={ropR.DL} unit={language === 'en' ? 'units' : 'од.'} />
                  <Res label={t('analytics.opt.rop.SS')} value={ropR.SS} unit={language === 'en' ? 'units' : 'од.'} />
                </div>
              ) : <p className="text-xs text-gray-400">{t('analytics.opt.rop.empty')}</p>}
            </Card>

            {/* #4 Safety Stock */}
            <Card num={4} title={t('analytics.opt.ss.title')} formula="SS = Z·σ·√L  /  Z·√(L·σd²+d²·σL²)">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Inp label={t('analytics.opt.ss.sig')} value={sSig} onChange={setSSig} />
                <Inp label={t('analytics.opt.ss.L')} value={sL} onChange={setSL} />
                <Inp label={t('analytics.opt.ss.d')} value={sDd} onChange={setSDd} />
                <Inp label={t('analytics.opt.ss.sigL')} value={sSigL} onChange={setSSigL} />
              </div>
              <Sel label={t('analytics.opt.ss.sl')} value={sSl} onChange={setSSl} opts={['90%','95%','99%']} />
              {ssR && (
                <div className="bg-blue-50 rounded-xl p-3 mt-3 space-y-0.5">
                  <Res label={t('analytics.opt.ss.basic')} value={ssR.basic} unit={language === 'en' ? 'units' : 'од.'} />
                  <Res label={t('analytics.opt.ss.ext')} value={ssR.ext} unit={language === 'en' ? 'units' : 'од.'} color="text-amber-600" />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ══ TAB 2: FORECAST ══ */}
      {tab === 'forecast' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">{t('analytics.forecast.dataLabel')}</h3>
              {txLoading && <span className="text-xs text-blue-500 animate-pulse">{t('analytics.forecast.loading')}</span>}
              {!txLoading && realMonthly.length >= 3 && (
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                  {t('analytics.forecast.realData', { n: realMonthly.length })}
                </span>
              )}
              {!txLoading && realMonthly.length < 3 && (
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                  {t('analytics.forecast.fewTx')}
                </span>
              )}
            </div>
            <textarea rows={2} value={raw} onChange={e => { txAutoFilledRef.current = true; setRaw(e.target.value); setDemandLabels([]); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">
              {demandLabels.length > 0
                ? t('analytics.forecast.months', { months: demandLabels.join(' · ') })
                : t('analytics.forecast.manualValues', { n: demand.length })}
            </p>
          </div>

          {demand.length < 3 && !txLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              {t('analytics.forecast.minDataWarn')}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card num={5} title={t('analytics.forecast.sma.title')} formula="SMAₜ = (ΣDₜ₋ᵢ) / n">
              <Inp label={t('analytics.forecast.sma.n')} value={smaN} onChange={setSmaN} />
            </Card>
            <Card num={6} title={t('analytics.forecast.ses.title')} formula="Fₜ = α·Dₜ₋₁ + (1−α)·Fₜ₋₁">
              <Inp label={t('analytics.forecast.ses.a')} value={sesA} onChange={setSesA} step="0.05" />
            </Card>
            <Card num={7} title={t('analytics.forecast.holt.title')} formula="F(t+m) = Lₜ + m·Tₜ">
              <div className="grid grid-cols-3 gap-1.5">
                <Inp label={t('analytics.forecast.holt.a')} value={hA} onChange={setHA} step="0.05" />
                <Inp label={t('analytics.forecast.holt.b')} value={hB} onChange={setHB} step="0.05" />
                <Inp label={t('analytics.forecast.holt.m')} value={hM} onChange={setHM} />
              </div>
            </Card>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">{t('analytics.forecast.chart.title')}</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="p" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name={t('analytics.forecast.chart.actual')} stroke="#111827" strokeWidth={2} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="sma"    name="SMA"      stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls={false} />
                  <Line type="monotone" dataKey="ses"    name="SES"      stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls={false} />
                  <Line type="monotone" dataKey="holt"   name="Holt DES" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 2" connectNulls={false} />
                  <Line type="monotone" dataKey="reg"    name={t('analytics.forecast.chart.reg')} stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="7 2" connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <p className="text-sm text-center">
                  {t('analytics.forecast.chart.empty')}<br />
                  <span className="text-xs">{t('analytics.forecast.chart.example')}</span>
                </p>
              </div>
            )}
          </div>

          {lrR && (
            <Card num={8} title={t('analytics.forecast.reg.title')} formula="D̂ₜ = a + b·t  |  b = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²)">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Intercept a', val: lrR.a, color: 'text-gray-900' },
                  { label: t('analytics.forecast.reg.slope'), val: (lrR.b >= 0 ? '+' : '') + lrR.b, color: lrR.b >= 0 ? 'text-green-600' : 'text-red-600' },
                  { label: t('analytics.forecast.reg.quality'), val: lrR.R2, color: lrR.R2 > 0.7 ? 'text-green-600' : lrR.R2 > 0.4 ? 'text-amber-600' : 'text-red-600' },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                    <div className={`text-xl font-bold ${c.color}`}>{c.val}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {lrR.b > 0
                  ? t('analytics.forecast.reg.up', { b: lrR.b })
                  : lrR.b < 0
                    ? t('analytics.forecast.reg.down', { b: Math.abs(lrR.b) })
                    : t('analytics.forecast.reg.stable')}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ══ TAB 3: CLASSIFICATION ══ */}
      {tab === 'class' && (
        <div className="space-y-4">
          {/* #9 ABC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">9</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('analytics.class.abc.title')}</h3>
                  <p className="text-xs font-mono text-gray-400">wᵢ = Qᵢ·Pᵢ / ΣQⱼ·Pⱼ · {language === 'en' ? 'Data: current stock × price' : 'Дані: поточний залишок × ціна'}</p>
                </div>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={abcSearch} onChange={e => setAbcSearch(e.target.value)}
                  placeholder="Пошук..." className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
                {abcSearch && <button onClick={() => setAbcSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
              </div>
            </div>
            {abcR.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">{t('analytics.class.abc.col.name')}</th>
                      <th className="text-right py-2">{t('analytics.class.abc.col.value')}</th>
                      <th className="text-right py-2">{t('analytics.class.abc.col.cumPct')}</th>
                      <th className="text-center py-2">{t('analytics.class.abc.col.class')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcR.filter(r => !abcSearch.trim() || r.name.toLowerCase().includes(abcSearch.toLowerCase())).map(r => (
                      <tr key={r.rank} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-gray-400 text-xs">{r.rank}</td>
                        <td className="py-1.5">{r.name}</td>
                        <td className="py-1.5 text-right text-gray-600">₴{r.value.toLocaleString()}</td>
                        <td className="py-1.5 text-right text-gray-400">{r.pct}%</td>
                        <td className="py-1.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: ABC_COL[r.class] }}>{r.class}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                  {['A','B','C'].map(cls => (
                    <span key={cls} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ABC_COL[cls] }} />
                      {cls}: {abcR.filter(r => r.class === cls).length} {t('analytics.class.abc.items')}
                    </span>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-gray-400">{t('analytics.class.abc.empty')}</p>}
          </div>

          {/* #10 XYZ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">10</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('analytics.class.xyz.title')}</h3>
                  <p className="text-xs font-mono text-gray-400">CV = σ / μ · {language === 'en' ? 'from real transactions (issuance + write-offs)' : 'за реальними транзакціями (видача + списання)'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {txLoading && <span className="text-xs text-blue-500 animate-pulse">{t('analytics.class.xyz.loading')}</span>}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={xyzSearch} onChange={e => setXyzSearch(e.target.value)}
                    placeholder="Пошук..." className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
                  {xyzSearch && <button onClick={() => setXyzSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                </div>
              </div>
            </div>
            {xyzR.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2">{t('analytics.class.xyz.col.name')}</th>
                      <th className="text-right py-2">{t('analytics.class.xyz.col.mean')}</th>
                      <th className="text-right py-2">{t('analytics.class.xyz.col.cv')}</th>
                      <th className="text-center py-2">{t('analytics.class.xyz.col.class')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xyzR.filter(r => !xyzSearch.trim() || r.name.toLowerCase().includes(xyzSearch.toLowerCase())).map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5">{r.name}</td>
                        <td className="py-1.5 text-right text-gray-500">{r.noData ? '—' : r.mean}</td>
                        <td className="py-1.5 text-right text-gray-500">{r.noData ? '—' : r.cv}</td>
                        <td className="py-1.5 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: r.noData ? '#9ca3af' : XYZ_COL[r.class] }}
                            title={r.noData ? t('analytics.class.xyz.noData') : undefined}
                          >{r.class}{r.noData ? '*' : ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> {t('analytics.class.xyz.X')}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> {t('analytics.class.xyz.Y')}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> {t('analytics.class.xyz.Z')}</span>
                  {xyzR.some(r => r.noData) && <span className="text-gray-400">{t('analytics.class.xyz.noData')}</span>}
                </div>
              </>
            ) : <p className="text-sm text-gray-400">{t('analytics.class.xyz.empty')}</p>}
          </div>
        </div>
      )}

      {/* ══ TAB 4: RISK ══ */}
      {tab === 'risk' && (
        <div className="space-y-4">
          {/* #11 Poisson */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">11</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{t('analytics.risk.poisson.title')}</h3>
                <p className="text-xs font-mono text-gray-400">P(X=k) = λᵏ·e⁻λ / k!</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {t('analytics.risk.poisson.selectLabel')}
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={poisSearch !== '' || poisDropOpen ? poisSearch : (items.find(i => i._id === poisItemId)?.name ?? '')}
                  onChange={e => { setPoisSearch(e.target.value); setPoisItemId(''); setPoisDropOpen(true); }}
                  onFocus={() => { setPoisSearch(''); setPoisDropOpen(true); }}
                  onBlur={() => setTimeout(() => setPoisDropOpen(false), 150)}
                  placeholder={t('analytics.risk.poisson.allItems')}
                  className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {(poisItemId || poisSearch) && (
                  <button
                    onMouseDown={e => { e.preventDefault(); setPoisItemId(''); setPoisSearch(''); setPoisDropOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  ><XCircle size={14} /></button>
                )}
                {poisDropOpen && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {items
                      .filter(i => i.status === 'available' && (!poisSearch.trim() ||
                        i.name.toLowerCase().includes(poisSearch.toLowerCase()) ||
                        i.sku.toLowerCase().includes(poisSearch.toLowerCase())))
                      .map(item => (
                        <button
                          key={item._id}
                          onMouseDown={e => { e.preventDefault(); setPoisItemId(item._id); setPoisSearch(''); setPoisDropOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex flex-col gap-0.5 ${poisItemId === item._id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                        >
                          <span>{item.name}</span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {item.sku} · {t('analytics.risk.poisson.stock')} {item.current_stock} {item.unit} · {t('analytics.risk.poisson.issued')} {Math.round(itemDemandMap[item._id] ?? 0)} {language === 'en' ? 'units' : 'од.'}
                          </span>
                        </button>
                      ))}
                    {items.filter(i => i.status === 'available' && (!poisSearch.trim() ||
                      i.name.toLowerCase().includes(poisSearch.toLowerCase()) ||
                      i.sku.toLowerCase().includes(poisSearch.toLowerCase()))).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">Нічого не знайдено</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Inp label={t('analytics.risk.poisson.lambda')} value={lam} onChange={setLam} step="0.5" />
              <Inp label={t('analytics.risk.poisson.s')} value={stk} onChange={setStk} />
            </div>
            {(+lam > 0 || +stk >= 0) && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-green-700 font-medium">{t('analytics.risk.poisson.svcLevel')}</div>
                    <div className="text-2xl font-bold text-green-700">{poisR.pSvc}%</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-red-700 font-medium">{t('analytics.risk.poisson.defProb')}</div>
                    <div className="text-2xl font-bold text-red-700">{poisR.pDef}%</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={poisR.dist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="k" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: number | undefined) => [`${v ?? 0}%`, 'P(X=k)']} />
                    <Bar dataKey="prob" name="P(X=k)">
                      {poisR.dist.map(e => <Cell key={e.k} fill={e.k <= +stk ? '#3b82f6' : '#fca5a5'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
            {!lam && !txLoading && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                {t('analytics.risk.poisson.noLambda')}
              </p>
            )}
          </div>

          {/* #12 Criticality Index */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">12</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('analytics.risk.ci.title')}</h3>
                  <p className="text-xs font-mono text-gray-400">CI = W₁·(1/r) + W₂·C_norm + W₃·0.5 · {language === 'en' ? 'Data: stock, min_stock, price' : 'Дані: залишок, min_stock, ціна'}</p>
                </div>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={ciSearch} onChange={e => setCiSearch(e.target.value)}
                  placeholder="Пошук..." className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
                {ciSearch && <button onClick={() => setCiSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Inp label={t('analytics.risk.ci.W1')} value={w1} onChange={setW1} step="0.05" />
              <Inp label={t('analytics.risk.ci.W2')} value={w2} onChange={setW2} step="0.05" />
              <Inp label={t('analytics.risk.ci.W3')} value={w3} onChange={setW3} step="0.05" />
            </div>
            {ciR.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2">{t('analytics.risk.ci.col.name')}</th>
                    <th className="text-right py-2">{t('analytics.risk.ci.col.r')}</th>
                    <th className="text-right py-2">{t('analytics.risk.ci.col.ci')}</th>
                    <th className="text-center py-2">{t('analytics.risk.ci.col.level')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ciR.filter(r => !ciSearch.trim() || r.name.toLowerCase().includes(ciSearch.toLowerCase())).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5">{r.name}</td>
                      <td className="py-1.5 text-right text-gray-500">{r.sr}</td>
                      <td className="py-1.5 text-right font-mono font-medium">{r.ci}</td>
                      <td className="py-1.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: CI_COL[r.level] }}>
                          {t(`analytics.risk.ci.${r.level}` as any)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-gray-400">{t('analytics.risk.ci.empty')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
