

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Store } from '../../types/data';
import { styles } from '../../styles';
import { Modal, ConfirmModal } from '../common/Modals';
import { Dropdown } from '../common/Dropdown';
import { PlusIcon, PencilIcon, TrashIcon, MoreVertIcon, SearchIcon } from '../common/Icons';

interface HomePageProps {
    stores: Store[];
    onSelectStore: (id: string) => void;
    onAddStore: (store: Store) => void;
    onUpdateStore: (id: string, data: { name: string; address: string }) => void;
    onDeleteStore: (id: string) => void;
}
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

export const HomePage: React.FC<HomePageProps> = ({ stores, onSelectStore, onAddStore, onUpdateStore, onDeleteStore }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [formData, setFormData] = useState({ name: '', address: '' });
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { if (isFormModalOpen) { setTimeout(() => inputRef.current?.focus(), 100); } }, [isFormModalOpen]);

    const handleOpenAddModal = () => { setEditingStore(null); setFormData({ name: '', address: '' }); setIsFormModalOpen(true); };
    const handleOpenEditModal = (store: Store) => { setEditingStore(store); setFormData({ name: store.name, address: store.address || '' }); setIsFormModalOpen(true); };
    const handleCloseModal = () => { if (isSaving) return; setIsFormModalOpen(false); setEditingStore(null); setFormData({ name: '', address: '' }); setError(''); };
    
    const handleSaveStore = () => {
        if (!formData.name.trim()) { setError('Nama toko tidak boleh kosong.'); return; }
        setIsSaving(true);
        try {
            if (editingStore) { onUpdateStore(editingStore.id, { name: formData.name.trim(), address: formData.address.trim() || '' }); } 
            else { const newStore: Store = { id: generateId('TKO'), name: formData.name.trim(), address: formData.address.trim() || '', items: [], inventory: [], assets: [], costs: [], itemCategories: [], units: [], assetCategories: [], investors: [], cashFlow: [], capitalRecouped: 0, netProfit: 0 }; onAddStore(newStore); }
            handleCloseModal();
        } catch (err) { console.error("Failed to save store:", err); setError("Gagal menyimpan toko. Operasi lokal seharusnya tidak gagal."); } 
        finally { setIsSaving(false); }
    };
    
    const handleConfirmDelete = () => {
        if(confirmDelete) { onDeleteStore(confirmDelete.id); setConfirmDelete(null); } 
    };

    const filteredStores = useMemo(() => {
        if (!searchQuery) return stores;
        return stores.filter(store =>
            store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (store.address && store.address.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [stores, searchQuery]);

    return <>
        <ConfirmModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleConfirmDelete} title={`Hapus Toko "${confirmDelete?.name}"?`}>
            <p>Yakin ingin menghapus toko ini? Semua data barang, aset, biaya, dan riwayat opname terkait akan hilang selamanya.</p>
        </ConfirmModal>
        <Modal isOpen={isFormModalOpen} onClose={handleCloseModal} title={editingStore ? 'Edit Toko' : 'Tambah Toko Baru'}>
            <div style={styles.formGroup}><label htmlFor="store-name" style={styles.formLabel}>Nama Toko</label><input ref={inputRef} style={styles.input} type="text" id="store-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="cth: Toko Sejahtera Abadi" disabled={isSaving}/>{error && <p style={{color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '8px'}}>{error}</p>}</div>
             <div style={styles.formGroup}><label htmlFor="store-address" style={styles.formLabel}>Alamat</label><textarea id="store-address" style={{...styles.input, height: '80px', resize: 'vertical'}} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="cth: Jl. Merdeka No. 45, Bandung" disabled={isSaving}/></div>
            <div style={styles.modalFooter} className="modal-footer-style">
                <button onClick={handleCloseModal} style={{...styles.button, ...styles.buttonOutline}} disabled={isSaving}>Batal</button>
                <button onClick={handleSaveStore} style={{...styles.button, ...styles.buttonPrimary}} disabled={isSaving}>{isSaving && <div className="spinner"></div>}{isSaving ? 'Menyimpan...' : (editingStore ? 'Simpan Perubahan' : 'Simpan Toko')}</button>
            </div>
        </Modal>
        <div style={styles.headerActions} className="responsive-header-actions">
            <div><h2 style={{...styles.header, margin: 0}} className="header-style">Daftar Toko</h2><p style={{...styles.pageDescription, margin: '4px 0 0 0'}} className="page-description-style">Pilih toko untuk mengelola data atau memulai stock opname.</p></div>
            <div style={{display: 'flex', gap: '12px'}}>
                <div style={styles.searchInputWrapper}>
                    <div style={styles.searchInputIcon}><SearchIcon /></div>
                    <input 
                        type="text" 
                        placeholder="Cari toko..." 
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button onClick={handleOpenAddModal} style={{...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon}} title="Tambah Toko Baru"><PlusIcon /></button>
            </div>
        </div>
        <div style={styles.storeGrid}>{filteredStores.length > 0 ? filteredStores.map(store => {
            const menuItems = [ 
                { label: 'Edit Toko', icon: <PencilIcon size={16} />, onClick: () => handleOpenEditModal(store) }, 
                { label: 'Hapus Toko', icon: <TrashIcon size={16} />, onClick: () => setConfirmDelete(store) }, 
            ];
            
            return (
                <div key={store.id} className="store-card" onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) {
                        return;
                    }
                    onSelectStore(store.id);
                }}>
                    <div style={{ flexGrow: 1, paddingRight: '16px' }}>
                        <h3 style={styles.storeCardTitle}>{store.name}</h3>
                        {store.address && <p style={styles.storeCardAddress}>{store.address}</p>}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown 
                            trigger={<button style={{ ...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall, alignSelf: 'flex-start', borderColor: 'transparent', background: 'transparent' }} title="Opsi"><MoreVertIcon size={20} color="var(--text-secondary)" /></button>} 
                            menuItems={menuItems} 
                            menuPositionStyle={{ minWidth: '180px' }}
                        />
                    </div>
                </div>
            )
        }) : <p>Toko tidak ditemukan atau belum ada toko yang ditambahkan.</p>}</div>
    </>;
};
