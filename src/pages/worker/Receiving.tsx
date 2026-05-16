import React, { useState } from 'react';
import { PackagePlus, Search, Link, PlusCircle, Box, CheckCircle2, XCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useItems } from '../../context/ItemsContext';
import { apiCreateTransaction } from '../../utils/api';
import { translateItemName, translateUnit } from '../../utils/translateItem';

const Receiving = () => {
    const [receiveMode, setReceiveMode] = useState<'existing' | 'new'>('existing');

    // Existing item search
    const [selectedProduct, setSelectedProduct] = useState('');
    const [itemSearch, setItemSearch]           = useState('');
    const [itemDropOpen, setItemDropOpen]       = useState(false);

    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku]   = useState('');
    const [newProductCategory, setNewProductCategory] = useState('');
    const [categorySearch, setCategorySearch]         = useState('');
    const [categoryDropOpen, setCategoryDropOpen]     = useState(false);
    const [newProductUnit, setNewProductUnit]   = useState('шт');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductExpiryDate, setNewProductExpiryDate] = useState('');

    const [quantity, setQuantity] = useState('');
    const [invoiceRef, setInvoiceRef] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { user } = useAuth();
    const { t, language } = useLanguage();
    const { items, updateItem, createItem, refetch } = useItems();

    // ── Category list ─────────────────────────────────────────────────────────
    const ALL_CATEGORIES = [
        { value: 'cpu',         label: t('receiving.category.cpu') },
        { value: 'motherboard', label: t('receiving.category.motherboard') },
        { value: 'gpu',         label: t('receiving.category.gpu') },
        { value: 'ram',         label: t('receiving.category.ram') },
        { value: 'storage',     label: t('receiving.category.storage') },
        { value: 'psu',         label: t('receiving.category.psu') },
        { value: 'case',        label: t('receiving.category.case') },
        { value: 'cooling',     label: t('receiving.category.cooling') },
        { value: 'peripherals', label: t('receiving.category.peripherals') },
        { value: 'cables',      label: t('receiving.category.cables') },
        { value: 'consumables', label: t('receiving.category.consumables') },
        { value: 'other',       label: t('receiving.category.other') },
    ];

    const filteredCategories = ALL_CATEGORIES.filter(c =>
        !categorySearch || c.label.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const selectCategory = (value: string, label: string) => {
        setNewProductCategory(value);
        setCategorySearch(label);
        setCategoryDropOpen(false);
    };

    // ── Item search ───────────────────────────────────────────────────────────
    const filteredItems = items.filter(it =>
        !itemSearch ||
        it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        it.sku.toLowerCase().includes(itemSearch.toLowerCase())
    );

    const selectItem = (id: string) => {
        const it = items.find(i => i._id === id);
        setSelectedProduct(id);
        setItemSearch(it ? `${translateItemName(it.name, language)} (${it.sku})` : '');
        setItemDropOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const qty = Number(quantity);
            let msg = '';

            if (receiveMode === 'existing') {
                const item = items.find(p => p._id === selectedProduct);
                if (!item) return;

                await updateItem(item._id, {
                    current_stock: item.current_stock + qty,
                    received_date: new Date().toISOString(),
                    received_by: user?._id || '',
                });

                await apiCreateTransaction({
                    type: 'in',
                    product_id: item._id,
                    quantity: qty,
                    date: new Date().toISOString(),
                    user_id: user?._id || '',
                    ref_document_id: invoiceRef || null,
                    notes: `Прийом: ${item.name}`,
                });

                msg = t('msg.success.addedToStock', { quantity, name: item.name });
            } else {
                await createItem({
                    name: newProductName,
                    sku: newProductSku,
                    category: newProductCategory,
                    current_stock: qty,
                    min_stock: 10,
                    unit: newProductUnit,
                    unit_price: Number(newProductPrice) || 0,
                    tax_rate: 0.2,
                    status: 'available',
                    received_date: new Date().toISOString(),
                    expiry_date: newProductExpiryDate || null,
                    received_by: user?._id || '',
                });

                msg = t('msg.success.registeredNew', { name: newProductName, quantity });
            }

            await refetch();
            setSuccessMessage(msg);
            setTimeout(() => setSuccessMessage(''), 5000);

            setSelectedProduct(''); setItemSearch(''); setItemDropOpen(false);
            setNewProductName('');
            setNewProductSku('');
            setNewProductCategory(''); setCategorySearch(''); setCategoryDropOpen(false);
            setNewProductUnit('шт');
            setNewProductPrice('');
            setNewProductExpiryDate('');
            setQuantity('');
            setInvoiceRef('');
        } catch (err: any) {
            setSuccessMessage(`Помилка: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl border-slate-100">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('receiving.title')}</h2>
                <p className="text-slate-500 mt-1">{t('receiving.subtitle')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-green-50 rounded-full flex items-center justify-center opacity-40 pointer-events-none">
                    <PackagePlus size={80} className="text-green-500/20" />
                </div>

                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in relative z-10">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <p className="text-sm font-medium text-green-800">{successMessage}</p>
                    </div>
                )}

                <div className="flex p-1 bg-slate-50 rounded-xl mb-8 border border-slate-200/60 relative z-10 w-full max-w-sm">
                    <button
                        type="button"
                        onClick={() => setReceiveMode('existing')}
                        className={twMerge(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                            receiveMode === 'existing'
                                ? "bg-white text-green-700 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Box size={16} />
                        {t('receiving.tab.existing')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setReceiveMode('new')}
                        className={twMerge(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                            receiveMode === 'new'
                                ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <PlusCircle size={16} />
                        {t('receiving.tab.new')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">

                    {receiveMode === 'existing' ? (
                        <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.existingItem')}</label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={itemSearch}
                                    onChange={e => { setItemSearch(e.target.value); setSelectedProduct(''); setItemDropOpen(true); }}
                                    onFocus={() => setItemDropOpen(true)}
                                    onBlur={() => setTimeout(() => setItemDropOpen(false), 150)}
                                    placeholder={t('receiving.placeholder.search')}
                                    className="block w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all shadow-sm"
                                />
                                {selectedProduct && (
                                    <button type="button" onMouseDown={() => { setSelectedProduct(''); setItemSearch(''); setItemDropOpen(true); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <XCircle size={15} />
                                    </button>
                                )}
                                {/* hidden required input for form validation */}
                                <input type="text" required value={selectedProduct} onChange={() => {}} className="sr-only" tabIndex={-1} />

                                {itemDropOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                        {filteredItems.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-4">{t('dashboard.noResults')}</p>
                                        ) : filteredItems.map(it => (
                                            <button key={it._id} type="button"
                                                onMouseDown={() => selectItem(it._id)}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{translateItemName(it.name, language)}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{it.sku}</p>
                                                </div>
                                                <span className={`text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${it.current_stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                    {it.current_stock} {translateUnit(it.unit, language)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100/50 space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.newName')}</label>
                                <input
                                    type="text"
                                    required
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder={t('receiving.placeholder.newName')}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.sku')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={newProductSku}
                                        onChange={(e) => setNewProductSku(e.target.value)}
                                        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        placeholder={t('receiving.placeholder.sku')}
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.category')}</label>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={categorySearch}
                                            onChange={e => { setCategorySearch(e.target.value); setNewProductCategory(''); setCategoryDropOpen(true); }}
                                            onFocus={() => setCategoryDropOpen(true)}
                                            onBlur={() => setTimeout(() => setCategoryDropOpen(false), 150)}
                                            placeholder={t('receiving.placeholder.category')}
                                            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        />
                                        {/* hidden required input */}
                                        <input type="text" required value={newProductCategory} onChange={() => {}} className="sr-only" tabIndex={-1} />
                                    </div>
                                    {categoryDropOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {filteredCategories.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-3">Нічого не знайдено</p>
                                            ) : filteredCategories.map(c => (
                                                <button key={c.value} type="button"
                                                    onMouseDown={() => selectCategory(c.value, c.label)}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${newProductCategory === c.value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}>
                                                    {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.unit')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={newProductUnit}
                                        onChange={(e) => setNewProductUnit(e.target.value)}
                                        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        placeholder={t('receiving.placeholder.unit')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.price')}</label>
                                    <input
                                        type="number"
                                        required
                                        value={newProductPrice}
                                        onChange={(e) => setNewProductPrice(e.target.value)}
                                        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.expiryDate')}</label>
                                    <input
                                        type="date"
                                        value={newProductExpiryDate}
                                        onChange={(e) => setNewProductExpiryDate(e.target.value)}
                                        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.quantity')}</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className={twMerge(
                                    "block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none transition-all shadow-sm",
                                    receiveMode === 'new' ? "focus:ring-2 focus:ring-blue-500 focus:border-blue-500" : "focus:ring-2 focus:ring-green-500 focus:border-green-500 border-green-400 border-2"
                                )}
                                placeholder={t('receiving.placeholder.quantity')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('receiving.field.invoice')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Link className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    value={invoiceRef}
                                    onChange={(e) => setInvoiceRef(e.target.value)}
                                    placeholder={t('receiving.placeholder.noInvoice')}
                                    className={twMerge(
                                        "block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none transition-all shadow-sm text-slate-600",
                                        receiveMode === 'new' ? "focus:ring-2 focus:ring-blue-500 focus:border-blue-500" : "focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={twMerge(
                                "w-full sm:w-auto px-8 py-3 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed",
                                receiveMode === 'new'
                                    ? "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 shadow-blue-600/20"
                                    : "bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-100 shadow-green-600/20"
                            )}
                        >
                            {receiveMode === 'new' ? (
                                <>
                                    <PlusCircle size={18} />
                                    {isSubmitting ? 'Реєстрація...' : t('receiving.btn.registerNew')}
                                </>
                            ) : (
                                <>
                                    <PackagePlus size={18} />
                                    {isSubmitting ? 'Збереження...' : t('receiving.btn.addToStock')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Receiving;
