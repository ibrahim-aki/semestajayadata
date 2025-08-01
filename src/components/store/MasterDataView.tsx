

import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../styles';
import { ConfirmModal, InfoModal } from '../common/Modals';
import { PlusIcon, PencilIcon, TrashIcon } from '../common/Icons';

interface MasterDataViewProps {
    title: string;
    data: any[];
    columns: { key: string; label: string; }[];
    onSave: (formData: any, editingItem: any) => void;
    onDelete: (id: string) => void;
    formInputs: { key: string; label: string; type?: string; }[];
    emptyForm: any;
    usageCheck?: (id: string) => boolean;
    itemType: string;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ title, data, columns, onSave, onDelete, formInputs, emptyForm, usageCheck, itemType }) => {
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const showForm = isAdding || editingItem !== null;
    useEffect(() => { if (editingItem) { setFormData(editingItem); setIsAdding(false); } }, [editingItem]);
    useEffect(() => { if (showForm) { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => firstInputRef.current?.focus(), 300); } }, [showForm]);
    const handleCancel = () => { setIsAdding(false); setEditingItem(null); setFormData(emptyForm); };
    const handleSave = (e: React.FormEvent) => { 
        e.preventDefault(); 
        onSave(formData, editingItem); 
        handleCancel(); 
    };
    const handleDeleteClick = (itemId: string) => {
        if (usageCheck && usageCheck(itemId)) { setInfoMessage(`Tidak bisa menghapus. ${itemType} ini sedang digunakan oleh data lain.`); return; }
        setDeletingId(itemId);
        setIsConfirmOpen(true);
    };
    const handleConfirmDelete = () => { 
        if(deletingId) onDelete(deletingId); 
        setIsConfirmOpen(false); 
        setDeletingId(null); 
    };
    return <>
        <InfoModal isOpen={!!infoMessage} onClose={() => setInfoMessage('')} title="Operasi Ditolak">{infoMessage}</InfoModal>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={`Hapus ${itemType}?`}><p>Apakah Anda yakin ingin menghapus {itemType} ini? Tindakan ini tidak dapat diurungkan.</p></ConfirmModal>
        <div style={{ ...styles.headerActions, marginBottom: '16px' }} className="responsive-header-actions">
            <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.25rem' }}>{title}</h3>
            {!showForm && <button onClick={() => setIsAdding(true)} style={{ ...styles.button, ...styles.buttonPrimary, ...styles.buttonIcon }} title={`Tambah ${itemType} Baru`}><PlusIcon /></button> }
        </div>
        {showForm &&
            <div ref={formRef} style={styles.card}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem' }}>{editingItem ? `Edit ${itemType}` : `Tambah ${itemType} Baru`}</h3>
                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: `repeat(${formInputs.length}, 1fr) auto auto`, gap: '16px', alignItems: 'flex-end' }} className="responsive-form-grid">
                    {formInputs.map((input, index) => {
                        const inputId = `form-${input.key}-${editingItem?.id || 'new'}`;
                        return (<div key={input.key}><label htmlFor={inputId} style={styles.formLabel}>{input.label}</label><input id={inputId} ref={index === 0 ? firstInputRef : null} style={styles.input} type={input.type || 'text'} value={formData[input.key] || ''} onChange={e => setFormData({ ...formData, [input.key]: e.target.value })} required /></div>)
                    })}
                    <div><button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>{editingItem ? 'Simpan' : 'Tambah'}</button></div>
                    <div><button type="button" onClick={handleCancel} style={{ ...styles.button, ...styles.buttonOutline }}>Batal</button></div>
                </form>
            </div>
        }
        <div className="responsive-table-wrapper">
            <table style={styles.table}>
                <thead><tr>{columns.map(c => <th key={c.key} style={styles.th}>{c.label}</th>)}<th style={styles.th}>Aksi</th></tr></thead>
                <tbody>
                    {data.map(item => (<tr key={item.id}>{columns.map(c => <td key={c.key} style={styles.td}>{item[c.key]}</td>)}<td style={styles.td}><div style={styles.inlineFlex} className="responsive-inline-flex"><button onClick={() => setEditingItem(item)} style={{ ...styles.button, ...styles.buttonPrimary, ...styles.buttonIconSmall }} title={`Edit ${itemType}`}><PencilIcon /></button><button onClick={() => handleDeleteClick(item.id)} style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonIconSmall }} title={`Hapus ${itemType}`}><TrashIcon /></button></div></td></tr>))}
                </tbody>
            </table>
        </div>
    </>;
};
