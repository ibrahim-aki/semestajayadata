import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Store, OperationalCost } from '../../types/data';
import { styles } from '../../styles';
import { ConfirmModal } from '../common/Modals';
import { Dropdown } from '../common/Dropdown';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, MoreVertIcon } from '../common/Icons';

interface StoreCostsViewProps { store: Store; onStoreUpdate: (store: Store) => void; }
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

export const StoreCostsView: React.FC<StoreCostsViewProps> = ({ store, onStoreUpdate }) => {
    const emptyForm = { name: '', amount: '', frequency: 'bulanan' as OperationalCost['frequency'], description: '' };
    const [editingCost, setEditingCost] = useState<OperationalCost | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const showForm = isAdding || editingCost !== null;

    const formatNumberWithDots = (value: string | number): string => {
        if (value === null || value === undefined || value === '') return '';
        const stringValue = String(value).replace(/\D/g, '');
        if (stringValue === '') return '';
        return new Intl.NumberFormat('id-ID').format(Number(stringValue));
    };

    const parseNumberWithDots = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };
    
    useEffect(() => { if (editingCost) { setFormData({ name: editingCost.name, amount: String(editingCost.amount), frequency: editingCost.frequency, description: editingCost.description || '' }); setIsAdding(false); } }, [editingCost]);
    useEffect(() => { if (showForm) { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => firstInputRef.current?.focus(), 300); } }, [showForm]);
    const handleCancel = () => { setIsAdding(false); setEditingCost(null); setFormData(emptyForm); };
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(parseNumberWithDots(formData.amount));
        if (!formData.name || isNaN(amountNum) || formData.amount === '') return alert('Nama dan Jumlah biaya harus diisi dengan benar.');
        const costData = { name: formData.name, amount: amountNum, frequency: formData.frequency, description: formData.description };
        let updatedStore = { ...store };
        if (editingCost) { updatedStore.costs = store.costs.map(c => c.id === editingCost.id ? { ...c, ...costData } : c); }
        else { updatedStore.costs = [...store.costs, { ...costData, id: generateId(`${store.id}-CST`) }]; }
        onStoreUpdate(updatedStore);
        handleCancel();
    };
    const handleDeleteClick = (costId: string) => { setDeletingId(costId); setIsConfirmOpen(true); };
    const handleConfirmDelete = () => {
        if (!deletingId) return;
        onStoreUpdate({ ...store, costs: store.costs.filter(c => c.id !== deletingId) });
        setIsConfirmOpen(false); setDeletingId(null);
    };

    const filteredCosts = useMemo(() => {
        if (!searchQuery) return store.costs;
        return store.costs.filter(cost =>
            cost.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cost.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [store.costs, searchQuery]);

    return <>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Hapus Biaya?"><p>Yakin ingin menghapus biaya ini? Tindakan ini tidak dapat diurungkan.</p></ConfirmModal>
        <div style={{...styles.headerActions, marginBottom: '16px'}} className="responsive-header-actions">
            <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1.25rem'}}>Daftar Biaya Operasional</h3>
            <div style={{...styles.inlineFlex}}>
                 <div style={styles.searchInputWrapper}>
                    <div style={styles.searchInputIcon}><SearchIcon /></div>
                    <input 
                        type="text" 
                        placeholder="Cari nama biaya, keterangan..." 
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                {!showForm && <button onClick={() => setIsAdding(true)} style={{...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon}} title="Tambah Biaya Baru"><PlusIcon /></button>}
            </div>
        </div>
        {showForm && <div ref={formRef} style={styles.card}>
                <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.25rem'}}>{editingCost ? 'Edit Biaya' : 'Tambah Biaya Baru'}</h3>
                <form onSubmit={handleSave}>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', alignItems: 'flex-end', marginBottom: '16px'}} className="responsive-form-grid">
                        <div><label htmlFor="cost-name" style={styles.formLabel}>Biaya</label><input id="cost-name" ref={firstInputRef} style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required/></div>
                        <div>
                            <label htmlFor="cost-amount" style={styles.formLabel}>Jumlah (Rp)</label>
                            <input
                                id="cost-amount"
                                style={styles.input}
                                type="text"
                                value={formatNumberWithDots(formData.amount)}
                                onChange={e => setFormData({ ...formData, amount: parseNumberWithDots(e.target.value) })}
                                placeholder="Contoh: 500.000"
                                required
                            />
                        </div>
                        <div><label htmlFor="cost-frequency" style={styles.formLabel}>Frekuensi</label><select id="cost-frequency" style={styles.select} value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value as OperationalCost['frequency'] })}><option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan">Bulanan</option><option value="tahunan">Tahunan</option><option value="sekali">Sekali</option></select></div>
                    </div>
                     <div style={{marginBottom: '24px'}}><label htmlFor="cost-description" style={styles.formLabel}>Keterangan</label><textarea id="cost-description" style={{...styles.input, height: '80px', resize: 'vertical'}} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px'}} className="responsive-inline-flex"><button type="submit" style={{...styles.button, ...styles.buttonPrimary}}>{editingCost ? 'Simpan' : 'Tambah'}</button><button type="button" onClick={handleCancel} style={{ ...styles.button, ...styles.buttonOutline }}>Batal</button></div>
                </form>
            </div>
        }
        <div className="responsive-table-wrapper">
            <table style={styles.table}>
                <thead><tr><th style={styles.th}>Biaya</th><th style={styles.th}>Keterangan</th><th style={styles.th}>Frekuensi</th><th style={styles.th}>Jumlah</th><th style={styles.th}>Aksi</th></tr></thead>
                <tbody>{filteredCosts.map(cost => {
                    const menuItems = [
                        { label: 'Edit Biaya', icon: <PencilIcon size={16} />, onClick: () => setEditingCost(cost) },
                        { label: 'Hapus Biaya', icon: <TrashIcon size={16} />, onClick: () => handleDeleteClick(cost.id) },
                    ];
                    return (
                    <tr key={cost.id}><td style={styles.td}>{cost.name}</td><td style={styles.td}>{cost.description}</td><td style={styles.td}>{cost.frequency}</td><td style={styles.td}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(cost.amount)}</td>
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