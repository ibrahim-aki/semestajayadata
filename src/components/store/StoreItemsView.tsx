

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Store, Item } from '../../types/data';
import { styles } from '../../styles';
import { Modal, ConfirmModal } from '../common/Modals';
import { MasterDataView } from './MasterDataView';
import { Dropdown } from '../common/Dropdown';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, MoreVertIcon } from '../common/Icons';

interface StoreItemsViewProps { store: Store; onStoreUpdate: (store: Store) => void; }
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

export const StoreItemsView: React.FC<StoreItemsViewProps> = ({ store, onStoreUpdate }) => {
    const emptyForm = { name: '', categoryId: '', sellingUnitId: '', purchaseUnitId: '', conversionRate: '1', totalPurchasePrice: '', sellingPrice: '', description: '', stockPurchaseUnitQty: '', stockSellingUnitQty: '' };
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const showForm = isAdding || editingItem !== null;
    
    const [restockingItem, setRestockingItem] = useState<Item | null>(null);
    const [restockData, setRestockData] = useState({ quantity: '', unitId: '' });

    const formatNumberWithDots = (value: string | number): string => {
        if (value === null || value === undefined || value === '') return '';
        const stringValue = String(value).replace(/\D/g, '');
        if (stringValue === '') return '';
        return new Intl.NumberFormat('id-ID').format(Number(stringValue));
    };

    const parseNumberWithDots = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };

    useEffect(() => {
        if (editingItem) {
            const inventory = store.inventory.find(inv => inv.itemId === editingItem.id);
            const recordedStock = inventory?.recordedStock ?? 0;
            const rate = editingItem.conversionRate > 1 ? editingItem.conversionRate : 1;
            const purchaseUnitQty = Math.floor(recordedStock / rate);
            const sellingUnitQty = recordedStock % rate;
            
            const totalPurchasePriceForDisplay = editingItem.purchasePrice * rate * purchaseUnitQty;

            setFormData({
                name: editingItem.name,
                categoryId: editingItem.categoryId,
                sellingUnitId: editingItem.sellingUnitId,
                purchaseUnitId: editingItem.purchaseUnitId,
                conversionRate: String(editingItem.conversionRate),
                totalPurchasePrice: String(totalPurchasePriceForDisplay),
                sellingPrice: String(editingItem.sellingPrice),
                description: editingItem.description || '',
                stockPurchaseUnitQty: String(purchaseUnitQty),
                stockSellingUnitQty: String(sellingUnitQty)
            });
            setIsAdding(false);
        }
    }, [editingItem, store.inventory]);

    useEffect(() => {
        if (showForm) {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => firstInputRef.current?.focus(), 300);
        }
    }, [showForm]);
    
    useEffect(() => {
        if (formData.purchaseUnitId && !formData.sellingUnitId) {
            setFormData(prev => ({ ...prev, sellingUnitId: prev.purchaseUnitId }));
        }
    }, [formData.purchaseUnitId]);

    const handleCancel = () => { setIsAdding(false); setEditingItem(null); setFormData(emptyForm); };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const { name, categoryId, sellingUnitId, purchaseUnitId, conversionRate, totalPurchasePrice, sellingPrice, description, stockPurchaseUnitQty, stockSellingUnitQty } = formData;
        
        const rate = parseFloat(conversionRate) || 1;
        const totalPP = parseFloat(parseNumberWithDots(totalPurchasePrice)) || 0;
        const sp = parseFloat(parseNumberWithDots(sellingPrice)) || 0;

        const purchaseQty = parseInt(stockPurchaseUnitQty, 10) || 0;
        const sellingQty = parseInt(stockSellingUnitQty, 10) || 0;
        
        if (!name || !categoryId || !sellingUnitId || !purchaseUnitId) {
            return alert('Field dengan tanda bintang (*) wajib diisi.');
        }

        const totalStockInSellingUnits = (purchaseQty * rate) + sellingQty;
        
        let calculatedPurchasePricePerSellingUnit = 0;
        if (totalPP > 0 && purchaseQty > 0 && rate > 0) {
            const pricePerPurchaseUnit = totalPP / purchaseQty;
            calculatedPurchasePricePerSellingUnit = pricePerPurchaseUnit / rate;
        } else if (editingItem) {
             calculatedPurchasePricePerSellingUnit = editingItem.purchasePrice;
        }
        
        const itemData: Omit<Item, 'id' | 'sku'> = { name, categoryId, sellingUnitId, purchaseUnitId, conversionRate: rate, purchasePrice: calculatedPurchasePricePerSellingUnit, sellingPrice: sp, description };
        
        let updatedStore = JSON.parse(JSON.stringify(store));
        
        if (editingItem) {
            updatedStore.items = updatedStore.items.map((item: Item) => item.id === editingItem.id ? { ...item, ...itemData } : item);
            
            const invIndex = updatedStore.inventory.findIndex((inv: { itemId: string; }) => inv.itemId === editingItem.id);
            if (invIndex > -1) {
                updatedStore.inventory[invIndex].recordedStock = totalStockInSellingUnits;
            } else {
                updatedStore.inventory.push({ itemId: editingItem.id, recordedStock: totalStockInSellingUnits });
            }
        } else {
            const category = store.itemCategories.find(c => c.id === categoryId);
            const prefix = category?.prefix || 'BRG';
            const count = store.items.filter(i => i.categoryId === categoryId).length + 1;
            const sku = `${prefix}-${String(count).padStart(3, '0')}`;
            const newItem = { ...itemData, id: generateId(`${store.id}-ITM`), sku };
            updatedStore.items.push(newItem);
            updatedStore.inventory.push({ itemId: newItem.id, recordedStock: totalStockInSellingUnits });
        }
        
        onStoreUpdate(updatedStore);
        handleCancel();
    };

    const handleDeleteClick = (itemId: string) => { setDeletingId(itemId); setIsConfirmOpen(true); };
    const handleConfirmDelete = () => { if (!deletingId) return; const updatedItems = store.items.filter(item => item.id !== deletingId); const updatedInventory = store.inventory.filter(inv => inv.itemId !== deletingId); onStoreUpdate({ ...store, items: updatedItems, inventory: updatedInventory }); setIsConfirmOpen(false); setDeletingId(null); };
    const handleSaveCategory = (formData: any, editingItem: any) => { if (!formData.name || !formData.prefix) return alert('Nama dan Prefix harus diisi.'); const updatedCategories = editingItem ? store.itemCategories.map(c => c.id === editingItem.id ? { ...c, ...formData } : c) : [...store.itemCategories, { ...formData, id: generateId('IC') }]; onStoreUpdate({ ...store, itemCategories: updatedCategories }); };
    const handleDeleteCategory = (id: string) => { onStoreUpdate({ ...store, itemCategories: store.itemCategories.filter(c => c.id !== id) }); };
    const handleSaveUnit = (formData: any, editingItem: any) => { if (!formData.name) return alert('Nama Satuan harus diisi.'); const updatedUnits = editingItem ? store.units.map(u => u.id === editingItem.id ? { ...u, ...formData } : u) : [...store.units, { ...formData, id: generateId('U') }]; onStoreUpdate({ ...store, units: updatedUnits }); };
    const handleDeleteUnit = (id: string) => { onStoreUpdate({ ...store, units: store.units.filter(u => u.id !== id) }); };
    
    const handleOpenRestockModal = (item: Item) => {
        setRestockingItem(item);
        const defaultUnitId = item.purchaseUnitId !== item.sellingUnitId ? item.purchaseUnitId : item.sellingUnitId;
        setRestockData({ quantity: '', unitId: defaultUnitId });
    };

    const handleConfirmRestock = () => {
        if (!restockingItem || !restockData.quantity) {
            setRestockingItem(null);
            return;
        }

        const quantityToAdd = parseInt(restockData.quantity, 10);
        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            alert("Jumlah harus angka positif.");
            return;
        }

        let stockToAddInSellingUnits = quantityToAdd;
        if (restockData.unitId === restockingItem.purchaseUnitId) {
            stockToAddInSellingUnits = quantityToAdd * (restockingItem.conversionRate || 1);
        }
        
        let inventoryExists = false;
        const newInventory = store.inventory.map(inv => {
            if (inv.itemId === restockingItem.id) {
                inventoryExists = true;
                return { ...inv, recordedStock: inv.recordedStock + stockToAddInSellingUnits };
            }
            return inv;
        });

        if (!inventoryExists) {
            newInventory.push({ itemId: restockingItem.id, recordedStock: stockToAddInSellingUnits });
        }

        onStoreUpdate({ ...store, inventory: newInventory });
        setRestockingItem(null);
    };

    const restockUnitOptions = useMemo(() => {
        if (!restockingItem) return [];
        const purchaseUnitName = store.units.find(u => u.id === restockingItem.purchaseUnitId)?.name;
        const sellingUnitName = store.units.find(u => u.id === restockingItem.sellingUnitId)?.name;
        const options = [{ id: restockingItem.sellingUnitId, name: sellingUnitName }];
        if (restockingItem.purchaseUnitId !== restockingItem.sellingUnitId && purchaseUnitName) {
            options.unshift({ id: restockingItem.purchaseUnitId, name: purchaseUnitName });
        }
        return options.filter(opt => opt.name);
    }, [restockingItem, store.units]);


    const itemsWithDetails = useMemo(() => {
        const allItems = store.items.map(item => ({ 
            ...item, 
            categoryName: store.itemCategories.find(c => c.id === item.categoryId)?.name ?? 'N/A', 
            purchaseUnitName: store.units.find(u => u.id === item.purchaseUnitId)?.name ?? 'N/A',
            sellingUnitName: store.units.find(u => u.id === item.sellingUnitId)?.name ?? 'N/A', 
            recordedStock: store.inventory.find(inv => inv.itemId === item.id)?.recordedStock ?? 0 
        })).sort((a,b) => a.sku.localeCompare(b.sku));
        
        if (!searchQuery) return allItems;
        
        return allItems.filter(item =>
            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [store, searchQuery]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    
    const getStockDisplay = (stock: number, conversionRate: number, purchaseUnitName: string, sellingUnitName: string) => {
        if (!conversionRate || conversionRate <= 1 || purchaseUnitName === sellingUnitName) return `${stock} ${sellingUnitName}`;
        const purchaseUnitStock = Math.floor(stock / conversionRate);
        const sellingUnitStock = stock % conversionRate;
        let display = '';
        if (purchaseUnitStock > 0) display += `${purchaseUnitStock} ${purchaseUnitName}`;
        if (sellingUnitStock > 0) {
            if (display) display += `, ${sellingUnitStock} ${sellingUnitName}`;
            else display += `${sellingUnitStock} ${sellingUnitName}`;
        }
        return display || `0 ${sellingUnitName}`;
    };

    const purchasePricePerSellingUnit = useMemo(() => {
        const totalPrice = parseFloat(parseNumberWithDots(formData.totalPurchasePrice)) || 0;
        const stockQty = parseInt(formData.stockPurchaseUnitQty, 10);
        const rate = parseFloat(formData.conversionRate) || 1;
        
        if (!totalPrice || !stockQty || stockQty <= 0 || !rate || rate <= 0) {
            if (editingItem) return editingItem.purchasePrice;
            return 0;
        }
        
        const pricePerPurchaseUnit = totalPrice / stockQty;
        return pricePerPurchaseUnit / rate;

    }, [formData.totalPurchasePrice, formData.stockPurchaseUnitQty, formData.conversionRate, editingItem]);


    return <>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Hapus Barang?"><p>Yakin ingin menghapus barang ini? Stok terkait juga akan dihapus. Tindakan ini tidak dapat diurungkan.</p></ConfirmModal>
        
        <Modal isOpen={!!restockingItem} onClose={() => setRestockingItem(null)} title={`Tambah Stok: ${restockingItem?.name || ''}`}>
            <div>
                <div style={styles.formGroup}>
                    <label htmlFor="restock-quantity" style={styles.formLabel}>Jumlah</label>
                    <input id="restock-quantity" style={styles.input} type="number" min="1" value={restockData.quantity} onChange={e => setRestockData({...restockData, quantity: e.target.value})} />
                </div>
                <div style={styles.formGroup}>
                     <label htmlFor="restock-unit" style={styles.formLabel}>Satuan</label>
                     <select id="restock-unit" style={styles.select} value={restockData.unitId} onChange={e => setRestockData({...restockData, unitId: e.target.value})}>
                        {restockUnitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                     </select>
                </div>
            </div>
             <div style={styles.modalFooter}>
                <button onClick={() => setRestockingItem(null)} style={{...styles.button, ...styles.buttonOutline}}>Batal</button>
                <button onClick={handleConfirmRestock} style={{...styles.button, ...styles.buttonSuccess}}>Tambah Stok</button>
            </div>
        </Modal>

        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Kelola Kategori Barang"><MasterDataView title="" itemType="Kategori Barang" data={store.itemCategories} columns={[{ key: 'name', label: 'Nama Kategori' }, { key: 'prefix', label: 'Prefix SKU' }]} onSave={handleSaveCategory} onDelete={handleDeleteCategory} formInputs={[{ key: 'name', label: 'Nama Kategori' }, { key: 'prefix', label: 'Prefix SKU (3 Huruf)' }]} emptyForm={{ name: '', prefix: '' }} usageCheck={(id) => store.items.some(item => item.categoryId === id)} /></Modal>
        <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title="Kelola Satuan Barang"><MasterDataView title="" itemType="Satuan" data={store.units} columns={[{ key: 'name', label: 'Nama Satuan' }]} onSave={handleSaveUnit} onDelete={handleDeleteUnit} formInputs={[{ key: 'name', label: 'Nama Satuan' }]} emptyForm={{ name: '' }} usageCheck={(id) => store.items.some(item => item.sellingUnitId === id || item.purchaseUnitId === id)} /></Modal>
        <div style={{...styles.headerActions, marginBottom: '16px'}} className="responsive-header-actions">
            <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1.25rem'}}>Daftar Barang</h3>
            <div style={{...styles.inlineFlex}}>
                <div style={styles.searchInputWrapper}>
                    <div style={styles.searchInputIcon}><SearchIcon /></div>
                    <input type="text" placeholder="Cari SKU, nama, kategori..." style={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                {!showForm && <button onClick={() => setIsAdding(true)} style={{...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon}} title="Tambah Barang Baru"><PlusIcon /></button>}
            </div>
        </div>
        {showForm &&
            <div ref={formRef} style={styles.card}>
                <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.25rem'}}>{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
                <form onSubmit={handleSave}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px'}} className="responsive-form-grid">
                        
                        {/* Nama */}
                        <div style={{gridColumn: '1 / -1'}}>
                            <label htmlFor="item-name" style={styles.formLabel}>Nama *</label>
                            <input id="item-name" ref={firstInputRef} style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        
                        {/* Kategori */}
                        <div>
                            <div style={{...styles.inlineFlex, justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                <label htmlFor="item-category" style={{...styles.formLabel, marginBottom: 0}}>Kategori *</label>
                                <button type="button" onClick={() => setIsCategoryModalOpen(true)} style={{ ...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall}} title="Tambah Kategori Baru">
                                    <PlusIcon size={16}/>
                                </button>
                            </div>
                            <select id="item-category" style={styles.select} value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                                <option value="" disabled>Pilih Kategori</option>
                                {store.itemCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {/* Qty Beli */}
                        <div>
                             <div style={{...styles.inlineFlex, justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                <label htmlFor="item-purchase-unit" style={{...styles.formLabel, marginBottom: 0}}>Qty Beli *</label>
                                <button type="button" onClick={() => setIsUnitModalOpen(true)} style={{ ...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall}} title="Tambah Satuan Baru">
                                    <PlusIcon size={16}/>
                                </button>
                            </div>
                            <select id="item-purchase-unit" style={styles.select} value={formData.purchaseUnitId} onChange={e => setFormData({ ...formData, purchaseUnitId: e.target.value, sellingUnitId: e.target.value, conversionRate: '1' })} required>
                                <option value="" disabled>Pilih</option>
                                {store.units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        {/* Jumlah */}
                        <div>
                           <label htmlFor="item-stock-purchase-unit" style={styles.formLabel}>Jumlah</label>
                           <input id="item-stock-purchase-unit" aria-label="Jumlah stok dalam satuan beli" style={styles.input} type="number" min="0" value={formData.stockPurchaseUnitQty} onChange={e => setFormData({...formData, stockPurchaseUnitQty: e.target.value})} />
                        </div>
                        {/* Isi Konversi */}
                        <div>
                            <label htmlFor="item-conversion" style={styles.formLabel}>Isi Konversi</label>
                            <input id="item-conversion" style={styles.input} type="number" value={formData.conversionRate} onChange={e => setFormData({ ...formData, conversionRate: e.target.value })} min="1" />
                        </div>
                        
                        {/* Qty Sisa */}
                        <div>
                           <label htmlFor="item-stock-selling-unit" style={styles.formLabel}>Qty Sisa</label>
                           <input id="item-stock-selling-unit" aria-label="Jumlah sisa stok dalam satuan jual" style={styles.input} type="number" min="0" value={formData.stockSellingUnitQty} onChange={e => setFormData({...formData, stockSellingUnitQty: e.target.value})} />
                        </div>
                         {/* Qty Jual */}
                         <div>
                            <label htmlFor="item-selling-unit" style={styles.formLabel}>Qty Jual *</label>
                             <select id="item-selling-unit" style={styles.select} value={formData.sellingUnitId} onChange={e => setFormData({ ...formData, sellingUnitId: e.target.value })} required>
                                <option value="" disabled>Pilih Satuan</option>
                                {store.units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                        </div>
                        
                        {/* Total Harga Beli */}
                        <div>
                            <label htmlFor="item-purchase-price-pu" style={styles.formLabel}>Total Harga Beli</label>
                            <input
                                id="item-purchase-price-pu"
                                style={styles.input}
                                type="text"
                                placeholder="Contoh: 9.000.000"
                                value={formatNumberWithDots(formData.totalPurchasePrice)}
                                onChange={e => setFormData({ ...formData, totalPurchasePrice: e.target.value })}
                            />
                        </div>
                        {/* Harga /Qty */}
                        <div>
                            <label htmlFor="item-purchase-price-su" style={styles.formLabel}>Harga /Qty</label>
                            <input id="item-purchase-price-su" style={{...styles.input, backgroundColor: 'var(--bg-header)'}} type="text" value={formatCurrency(purchasePricePerSellingUnit)} readOnly />
                        </div>

                        {/* Harga Jual /Qty */}
                        <div>
                            <label htmlFor="item-selling-price" style={styles.formLabel}>Harga Jual /Qty</label>
                            <input
                                id="item-selling-price"
                                style={styles.input}
                                type="text"
                                placeholder="Contoh: 3.500"
                                value={formatNumberWithDots(formData.sellingPrice)}
                                onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                            />
                        </div>
                        {/* Ket. */}
                        <div>
                            <label htmlFor="item-description" style={styles.formLabel}>Ket.</label>
                            <textarea id="item-description" style={{...styles.input, height: '42px', resize: 'vertical'}} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>

                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px'}} className="modal-footer-style">
                        <button type="button" onClick={handleCancel} style={{ ...styles.button, ...styles.buttonOutline }}>Batal</button>
                        <button type="submit" style={{...styles.button, ...styles.buttonPrimary}}>{editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}</button>
                    </div>
                </form>
            </div>
        }
        <div className="responsive-table-wrapper">
            <table style={styles.table}>
                <thead><tr><th style={styles.th}>SKU</th><th style={styles.th}>Nama</th><th style={styles.th}>Kategori</th><th style={styles.th}>Stok</th><th style={styles.th}>Harga Beli (Satuan Jual)</th><th style={styles.th}>Harga Jual</th><th style={styles.th}>Margin (%)</th><th style={styles.th}>Aksi</th></tr></thead>
                <tbody>{itemsWithDetails.map(item => {
                    const menuItems = [
                        { label: 'Tambah Stok (Kulakan)', icon: <PlusIcon size={16} />, onClick: () => handleOpenRestockModal(item) },
                        { label: 'Edit Barang', icon: <PencilIcon size={16} />, onClick: () => setEditingItem(item) },
                        { isSeparator: true },
                        { label: 'Hapus Barang', icon: <TrashIcon size={16} />, onClick: () => handleDeleteClick(item.id) },
                    ];

                    const purchasePrice = item.purchasePrice;
                    const sellingPrice = item.sellingPrice;
                    let percentageText = '-';
                    let percentageColor = 'var(--text-secondary)';

                    if (purchasePrice > 0) {
                        const percentage = ((sellingPrice - purchasePrice) / purchasePrice) * 100;
                        percentageText = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;

                        if (percentage > 0) {
                            percentageColor = 'var(--success-color)';
                        } else if (percentage < 0) {
                            percentageColor = 'var(--danger-color)';
                        } else {
                            percentageColor = 'var(--text-primary)';
                        }
                    }

                    return (<tr key={item.id}>
                        <td style={styles.td}>{item.sku}</td>
                        <td style={{...styles.td, whiteSpace: 'nowrap'}}>{item.name}</td>
                        <td style={styles.td}>{item.categoryName}</td>
                        <td style={styles.td}>{getStockDisplay(item.recordedStock, item.conversionRate, item.purchaseUnitName, item.sellingUnitName)}</td>
                        <td style={styles.td}>{formatCurrency(item.purchasePrice)}</td>
                        <td style={styles.td}>{formatCurrency(item.sellingPrice)}</td>
                        <td style={{ ...styles.td, color: percentageColor, fontWeight: 'bold' }}>
                            {percentageText}
                        </td>
                        <td style={styles.td}>
                            <Dropdown 
                                trigger={<button style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall, borderColor: 'transparent', background: 'transparent'}} title="Opsi"><MoreVertIcon size={20} color="var(--text-secondary)" /></button>} 
                                menuItems={menuItems} 
                                menuPositionStyle={{minWidth: '220px'}}
                            />
                        </td>
                    </tr>);
                })}</tbody>
            </table>
        </div>
    </>;
};
