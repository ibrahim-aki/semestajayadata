import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Store, Investor } from '../../types/data';
import { styles } from '../../styles';
import { ConfirmModal } from '../common/Modals';
import { Dropdown } from '../common/Dropdown';
import { PlusIcon, PencilIcon, TrashIcon, MoreVertIcon, AlertTriangleIcon } from '../common/Icons';

interface StoreInvestorsViewProps { store: Store; onStoreUpdate: (store: Store) => void; }
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

export const StoreInvestorsView: React.FC<StoreInvestorsViewProps> = ({ store, onStoreUpdate }) => {
    const emptyForm = { name: '', sharePercentage: '' };
    const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const showForm = isAdding || editingInvestor !== null;

    const totalShare = useMemo(() => {
        return store.investors.reduce((sum, inv) => sum + Number(inv.sharePercentage), 0);
    }, [store.investors]);

    useEffect(() => { if (editingInvestor) { setFormData({ name: editingInvestor.name, sharePercentage: String(editingInvestor.sharePercentage) }); setIsAdding(false); } }, [editingInvestor]);
    useEffect(() => { if (showForm) { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => firstInputRef.current?.focus(), 300); } }, [showForm]);
    
    const handleCancel = () => { setIsAdding(false); setEditingInvestor(null); setFormData(emptyForm); };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const shareNum = parseFloat(formData.sharePercentage);
        if (!formData.name || isNaN(shareNum) || shareNum <= 0 || shareNum > 100) {
            alert('Nama dan Persentase Saham (1-100) harus diisi dengan benar.');
            return;
        }

        const currentTotalExcludingEditing = editingInvestor 
            ? totalShare - editingInvestor.sharePercentage 
            : totalShare;
            
        if (currentTotalExcludingEditing + shareNum > 100) {
            alert(`Total persentase saham tidak boleh melebihi 100%. Sisa saham yang tersedia: ${100 - currentTotalExcludingEditing}%.`);
            return;
        }

        const investorData = { name: formData.name, sharePercentage: shareNum };
        let updatedStore = { ...store };
        if (editingInvestor) { updatedStore.investors = store.investors.map(c => c.id === editingInvestor.id ? { ...c, ...investorData } : c); }
        else { updatedStore.investors = [...store.investors, { ...investorData, id: generateId(`${store.id}-INV`) }]; }
        onStoreUpdate(updatedStore);
        handleCancel();
    };

    const handleDeleteClick = (investorId: string) => { setDeletingId(investorId); setIsConfirmOpen(true); };
    const handleConfirmDelete = () => {
        if (!deletingId) return;
        onStoreUpdate({ ...store, investors: store.investors.filter(c => c.id !== deletingId) });
        setIsConfirmOpen(false); setDeletingId(null);
    };

    return <>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Hapus Investor?"><p>Yakin ingin menghapus investor ini? Tindakan ini tidak dapat diurungkan.</p></ConfirmModal>
        
        <div style={{...styles.headerActions, marginBottom: '16px'}} className="responsive-header-actions">
            <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1.25rem'}}>Daftar Investor</h3>
            {!showForm && <button onClick={() => setIsAdding(true)} style={{...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon}} title="Tambah Investor Baru"><PlusIcon /></button>}
        </div>

        {totalShare > 100 && (
             <div style={{...styles.card, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-border)', borderLeftWidth: '4px', marginBottom: '16px'}}>
                <AlertTriangleIcon color="var(--warning-icon)" size={24} />
                <div>
                    <h4 style={{margin: 0, color: 'var(--warning-text-header)' }}>Peringatan: Total Saham Melebihi Batas</h4>
                    <p style={{margin: '4px 0 0 0', color: 'var(--warning-text-body)'}}>Total persentase saham saat ini adalah {totalShare}%, melebihi 100%. Mohon perbaiki data investor.</p>
                </div>
            </div>
        )}

        {showForm && <div ref={formRef} style={styles.card}>
                <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.25rem'}}>{editingInvestor ? 'Edit Investor' : 'Tambah Investor Baru'}</h3>
                <form onSubmit={handleSave}>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: '16px', alignItems: 'flex-end', marginBottom: '16px'}} className="responsive-form-grid">
                        <div><label htmlFor="investor-name" style={styles.formLabel}>Nama Investor</label><input id="investor-name" ref={firstInputRef} style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required/></div>
                        <div>
                            <label htmlFor="investor-share" style={styles.formLabel}>Persentase Saham (%)</label>
                            <input id="investor-share" style={styles.input} type="number" step="0.1" min="0.1" max="100" value={formData.sharePercentage} onChange={e => setFormData({ ...formData, sharePercentage: e.target.value })} placeholder="Contoh: 20" required/>
                        </div>
                        <div style={{alignSelf: 'flex-end'}}><button type="submit" style={{...styles.button, ...styles.buttonPrimary}}>{editingInvestor ? 'Simpan' : 'Tambah'}</button></div>
                        <div style={{alignSelf: 'flex-end'}}><button type="button" onClick={handleCancel} style={{ ...styles.button, ...styles.buttonOutline }}>Batal</button></div>
                    </div>
                </form>
            </div>
        }

        <div className="responsive-table-wrapper">
            <table style={styles.table}>
                <thead><tr><th style={styles.th}>Nama Investor</th><th style={styles.th}>Persentase Saham</th><th style={styles.th}>Aksi</th></tr></thead>
                <tbody>
                    {store.investors.map(investor => {
                        const menuItems = [
                            { label: 'Edit Investor', icon: <PencilIcon size={16} />, onClick: () => setEditingInvestor(investor) },
                            { label: 'Hapus Investor', icon: <TrashIcon size={16} />, onClick: () => handleDeleteClick(investor.id) },
                        ];
                        return (
                        <tr key={investor.id}>
                            <td style={styles.td}>{investor.name}</td>
                            <td style={styles.td}>{investor.sharePercentage}%</td>
                            <td style={styles.td}>
                                <Dropdown 
                                    trigger={<button style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIconSmall, borderColor: 'transparent', background: 'transparent'}} title="Opsi"><MoreVertIcon size={20} color="var(--text-secondary)" /></button>} 
                                    menuItems={menuItems} 
                                />
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
                 <tfoot>
                    <tr style={{backgroundColor: 'var(--bg-header)'}}>
                        <td style={{...styles.td, fontWeight: 'bold'}}>Total Saham Investor</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{totalShare.toFixed(1)}%</td>
                        <td style={styles.td}></td>
                    </tr>
                     <tr style={{backgroundColor: 'var(--bg-header)'}}>
                        <td style={{...styles.td, fontWeight: 'bold'}}>Sisa Saham Pemilik</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{(100 - totalShare).toFixed(1)}%</td>
                        <td style={styles.td}></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </>;
};