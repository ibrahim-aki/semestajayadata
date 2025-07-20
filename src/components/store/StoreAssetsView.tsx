import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Store, Asset } from '../../types/data';
import { styles } from '../../styles';
import { Modal, ConfirmModal } from '../common/Modals';
import { MasterDataView } from './MasterDataView';
import { Dropdown } from '../common/Dropdown';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, MoreVertIcon } from '../common/Icons';

interface StoreAssetsViewProps { store: Store; onStoreUpdate: (store: Store) => void; }
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

export const StoreAssetsView: React.FC<StoreAssetsViewProps> = ({ store, onStoreUpdate }) => {
    const emptyForm: { [key: string]: any } = { name: '', purchaseDate: '', value: '', categoryId: '', description: '', condition: 'Normal' as Asset['condition'] };
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const showForm = isAdding || editingAsset !== null;

    const formatNumberWithDots = (value: string | number): string => {
        if (value === null || value === undefined || value === '') return '';
        const stringValue = String(value).replace(/\D/g, '');
        if (stringValue === '') return '';
        return new Intl.NumberFormat('id-ID').format(Number(stringValue));
    };

    const parseNumberWithDots = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };

    useEffect(() => { if (editingAsset) { setFormData({ ...editingAsset, value: String(editingAsset.value), description: editingAsset.description || '', condition: editingAsset.condition || 'Normal' }); setIsAdding(false); } }, [editingAsset]);
    useEffect(() => { if (showForm) { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => firstInputRef.current?.focus(), 300); } }, [showForm]);
    const handleCancel = () => { setIsAdding(false); setEditingAsset(null); setFormData(emptyForm); };
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const valueNum = parseFloat(parseNumberWithDots(formData.value));
        if (!formData.name || !formData.purchaseDate || !formData.categoryId || isNaN(valueNum)) return alert('Semua field harus diisi dengan benar.');
        const assetData = { name: formData.name, purchaseDate: formData.purchaseDate, value: valueNum, categoryId: formData.categoryId, description: formData.description, condition: formData.condition };
        let updatedStore = { ...store };
        if (editingAsset) { updatedStore.assets = store.assets.map(a => a.id === editingAsset.id ? { ...a, ...assetData } : a); }
        else { const category = store.assetCategories.find(c => c.id === formData.categoryId); const prefix = category?.prefix || 'AST'; const count = store.assets.filter(i => i.categoryId === formData.categoryId).length + 1; const code = `${prefix}-${String(count).padStart(3, '0')}`; updatedStore.assets = [...store.assets, { ...assetData, id: generateId(`${store.id}-AST`), code }]; }
        onStoreUpdate(updatedStore);
        handleCancel();
    };
    const handleDeleteClick = (assetId: string) => { setDeletingId(assetId); setIsConfirmOpen(true); };
    const handleConfirmDelete = () => { if (!deletingId) return; onStoreUpdate({ ...store, assets: store.assets.filter(a => a.id !== deletingId) }); setIsConfirmOpen(false); setDeletingId(null); };
    const handleSaveAssetCategory = (formData: any, editingItem: any) => {
        if (!formData.name || !formData.prefix) return alert('Nama dan Prefix harus diisi.');
        const updatedCategories = editingItem ? store.assetCategories.map(c => c.id === editingItem.id ? { ...c, ...formData } : c) : [...store.assetCategories, { ...formData, id: generateId('AC') }];
        onStoreUpdate({ ...store, assetCategories: updatedCategories });
    };
    const handleDeleteAssetCategory = (id: string) => { onStoreUpdate({ ...store, assetCategories: store.assetCategories.filter(c => c.id !== id) }); };
    
    const assetsWithDetails = useMemo(() => {
        const allAssets = store.assets.map(asset => ({ ...asset, categoryName: store.assetCategories.find(c => c.id === asset.categoryId)?.name ?? 'N/A' })).sort((a,b) => a.code.localeCompare(b.code));
        
        if(!searchQuery) return allAssets;
        
        return allAssets.filter(asset => 
            asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [store, searchQuery]);

    return <>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Hapus Aset?"><p>Yakin ingin menghapus aset ini? Tindakan ini tidak dapat diurungkan.</p></ConfirmModal>
        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Kelola Kategori Aset"><MasterDataView title="" itemType="Kategori Aset" data={store.assetCategories} columns={[{ key: 'name', label: 'Nama Kategori' }, { key: 'prefix', label: 'Prefix Kode' }]} onSave={handleSaveAssetCategory} onDelete={handleDeleteAssetCategory} formInputs={[{ key: 'name', label: 'Nama Kategori' }, { key: 'prefix', label: 'Prefix Kode (2-3 Huruf)' }]} emptyForm={{ name: '', prefix: '' }} usageCheck={(id) => store.assets.some(asset => asset.categoryId === id)} /></Modal>
        <div style={{...styles.headerActions, marginBottom: '16px'}} className="responsive-header-actions">
            <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1.25rem'}}>Daftar Aset</h3>
             <div style={{...styles.inlineFlex}}>
                <div style={styles.searchInputWrapper}>
                    <div style={styles.searchInputIcon}><SearchIcon /></div>
                    <input 
                        type="text" 
                        placeholder="Cari kode, nama, kategori..." 
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                {!showForm && <button onClick={() => setIsAdding(true)} style={{...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon}} title="Tambah Aset Baru"><PlusIcon /></button>}
            </div>
        </div>
        {showForm &&
            <div ref={formRef} style={styles.card}>
                <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.25rem'}}>{editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}</h3>
                <form onSubmit={handleSave}>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px'}} className="responsive-form-grid">
                        <div><label htmlFor="asset-name" style={styles.formLabel}>Aset</label><input id="asset-name" ref={firstInputRef} style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div>
                            <div style={{...styles.inlineFlex, justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                <label htmlFor="asset-category" style={{...styles.formLabel, marginBottom: 0}}>Kategori</label>
                                <button type="button" onClick={() => setIsCategoryModalOpen(true)} style={{ ...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall}} title="Tambah Kategori Baru">
                                    <PlusIcon size={16}/>
                                </button>
                            </div>
                            <select id="asset-category" style={styles.select} value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required><option value="" disabled>Pilih Kategori</option>{store.assetCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        </div>
                    </div>
                     <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px'}} className="responsive-form-grid">
                        <div><label htmlFor="asset-purchase-date" style={styles.formLabel}>Tgl. Perolehan</label><input id="asset-purchase-date" style={styles.input} type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} required /></div>
                        <div>
                            <label htmlFor="asset-value" style={styles.formLabel}>Nilai (Rp)</label>
                            <input
                                id="asset-value"
                                style={styles.input}
                                type="text"
                                value={formatNumberWithDots(formData.value)}
                                onChange={e => setFormData({ ...formData, value: parseNumberWithDots(e.target.value) })}
                                required
                                placeholder="Contoh: 3.000.000"
                            />
                        </div>
                        <div><label htmlFor="asset-condition" style={styles.formLabel}>Kondisi</label><select id="asset-condition" style={styles.select} value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value as Asset['condition'] })}><option value="Bagus">Bagus</option><option value="Normal">Normal</option><option value="Rusak">Rusak</option></select></div>
                    </div>
                    <div style={{marginBottom: '24px'}}><label htmlFor="asset-description" style={styles.formLabel}>Keterangan</label><textarea id="asset-description" style={{...styles.input, height: '80px', resize: 'vertical'}} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px'}} className="responsive-inline-flex"><button type="submit" style={{...styles.button, ...styles.buttonPrimary}}>{editingAsset ? 'Simpan' : 'Tambah'}</button><button type="button" onClick={handleCancel} style={{ ...styles.button, ...styles.buttonOutline }}>Batal</button></div>
                </form>
            </div>
        }
        <div className="responsive-table-wrapper">
            <table style={styles.table}>
                <thead><tr><th style={styles.th}>Kode</th><th style={styles.th}>Aset</th><th style={styles.th}>Keterangan</th><th style={styles.th}>Kategori</th><th style={styles.th}>Kondisi</th><th style={styles.th}>Tgl. Perolehan</th><th style={styles.th}>Nilai</th><th style={styles.th}>Aksi</th></tr></thead>
                <tbody>{assetsWithDetails.map(asset => {
                    const menuItems = [
                        { label: 'Edit Aset', icon: <PencilIcon size={16} />, onClick: () => setEditingAsset(asset) },
                        { label: 'Hapus Aset', icon: <TrashIcon size={16} />, onClick: () => handleDeleteClick(asset.id) },
                    ];
                    return (
                    <tr key={asset.id}><td style={styles.td}>{asset.code}</td><td style={styles.td}>{asset.name}</td><td style={styles.td}>{asset.description}</td><td style={styles.td}>{asset.categoryName}</td><td style={styles.td}>{asset.condition}</td><td style={styles.td}>{new Date(asset.purchaseDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td><td style={styles.td}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.value)}</td>
                    <td style={styles.td}>
                         <Dropdown 
                            trigger={<button style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall, borderColor: 'transparent', background: 'transparent'}} title="Opsi"><MoreVertIcon size={20} color="var(--text-secondary)" /></button>} 
                            menuItems={menuItems} 
                        />
                    </td>
                    </tr>
                )})}</tbody>
            </table>
        </div>
    </>;
};