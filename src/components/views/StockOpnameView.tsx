

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Store, OpnameSession, Asset } from '../../types/data';
import { styles } from '../../styles';
import { ConfirmModal } from '../common/Modals';
import { Dropdown } from '../common/Dropdown';
import { createAndDownloadExcel, SheetRequest } from '../../utils/exportUtils';

const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

interface StockOpnameViewProps { store: Store; onStoreUpdate: (store: Store) => void; onComplete: (session: OpnameSession) => void; onCancel: () => void; }

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({ store, onStoreUpdate, onComplete, onCancel }) => {
    const [opnameData, setOpnameData] = useState<{ [itemId: string]: number | '' }>({});
    const [assetConditions, setAssetConditions] = useState<{ [assetId: string]: Asset['condition'] }>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const opnameFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialItemData: { [itemId: string]: '' } = {};
        store.items.forEach(item => { initialItemData[item.id] = ''; });
        setOpnameData(initialItemData);

        const initialAssetConditions: { [assetId: string]: Asset['condition'] } = {};
        store.assets.forEach(asset => { initialAssetConditions[asset.id] = asset.condition; });
        setAssetConditions(initialAssetConditions);
    }, [store]);

    const handleCountChange = (itemId: string, value: string) => {
        const numValue = parseInt(value, 10);
        setOpnameData(prev => ({ ...prev, [itemId]: value === '' ? '' : (!isNaN(numValue) && numValue >= 0 ? numValue : prev[itemId]) }));
    };
    const handleConditionChange = (assetId: string, value: Asset['condition']) => {
        setAssetConditions(prev => ({ ...prev, [assetId]: value }));
    };
    const handleSubmitClick = () => {
        if (Object.values(opnameData).some(v => v === '')) {
            alert('Harap isi semua jumlah hitungan fisik. Isi dengan 0 jika barang kosong.');
            return;
        }
        setIsConfirmOpen(true);
    };
    const handleConfirmSubmit = () => {
        const reportItems = store.items.map(item => {
            const initialStock = store.inventory.find(inv => inv.itemId === item.id)?.recordedStock ?? 0;
            const physicalCount = Number(opnameData[item.id] ?? 0);
            const unitName = store.units.find(u => u.id === item.sellingUnitId)?.name ?? 'N/A';
            return { itemId: item.id, itemName: item.name, unit: unitName, initialStock, physicalCount, discrepancy: physicalCount - initialStock };
        });
        const reportAssetChanges = store.assets
            .map(asset => ({ assetId: asset.id, assetName: asset.name, oldCondition: asset.condition, newCondition: assetConditions[asset.id] }))
            .filter(change => change.oldCondition !== change.newCondition);
        const newOpnameSession: OpnameSession = { 
            id: generateId('OPN'), storeId: store.id, date: new Date().toISOString(), status: 'completed', items: reportItems, assetChanges: reportAssetChanges
        };
        const newInventory = store.items.map(item => ({ itemId: item.id, recordedStock: Number(opnameData[item.id] ?? 0) }));
        const updatedAssets = store.assets.map(asset => ({ ...asset, condition: assetConditions[asset.id] || asset.condition }));
        const updatedStore = { ...store, inventory: newInventory, assets: updatedAssets };
        onStoreUpdate(updatedStore);
        onComplete(newOpnameSession);
        setIsConfirmOpen(false);
    };

    const itemsWithDetails = useMemo(() => store.items.map(item => ({
        ...item,
        sellingUnitName: store.units.find(u => u.id === item.sellingUnitId)?.name ?? 'N/A',
        recordedStock: store.inventory.find(inv => inv.itemId === item.id)?.recordedStock ?? 0
    })).sort((a,b) => a.name.localeCompare(b.name)), [store]);
    
    const handleExportForOpnameExcel = useCallback(() => {
        const itemsToExport = itemsWithDetails.map(item => ({ 'Nama': item.name, 'Satuan': item.sellingUnitName, 'Stok Awal': item.recordedStock, 'Stok Terkini (Isi di sini)': '', 'Selisih': '' }));
        const assetsToExport = store.assets.map(asset => ({ 'Aset': asset.name, 'Kondisi (Isi: Bagus/Normal/Rusak)': '' }));
        
        const sheetRequests: SheetRequest[] = [
            { sheetName: "Pemeriksaan Barang", data: itemsToExport },
            { sheetName: "Pemeriksaan Aset", data: assetsToExport }
        ];

        createAndDownloadExcel(sheetRequests, `${store.name}-Opname Offline.xlsx`);
    }, [store, itemsWithDetails]);
    
    const handleExportForOpnamePdf = useCallback(() => {
        if (!opnameFormRef.current) return;
        setIsGeneratingPdf(true);
        const formElement = opnameFormRef.current;
        formElement.classList.add('exporting-to-pdf');
        html2canvas(formElement, { scale: 2, useCORS: true, logging: false })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                const imgHeight = pdfWidth / ratio;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = position - pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(`${store.name}-Form_Opname_Offline.pdf`);
            })
            .catch(err => { console.error("Error generating PDF:", err); alert("Gagal membuat PDF. Silakan coba lagi."); })
            .finally(() => { formElement.classList.remove('exporting-to-pdf'); setIsGeneratingPdf(false); });
    }, [store.name]);

    const exportMenuItems = [
        { label: 'Ekspor ke Excel', onClick: handleExportForOpnameExcel },
        { label: 'Ekspor ke PDF', onClick: handleExportForOpnamePdf },
    ];

    return <>
        <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmSubmit} title="Selesaikan Stock Opname?" confirmText="Ok" confirmButtonStyle={styles.buttonSuccess}>
            <p>Selisih stok akan ditampilkan sesuai dengan hasil hitungan fisik Anda. Pastikan semua data sudah benar sebelum melanjutkan.</p>
        </ConfirmModal>
        <div style={{...styles.headerActions, justifyContent: 'space-between', alignItems: 'center' }} className="responsive-header-actions">
            <div>
                <h2 style={{...styles.header, marginBottom: '8px'}} className="header-style">Stock Opname: {store.name}</h2>
                <p style={{...styles.pageDescription, margin: 0}} className="page-description-style">Masukkan jumlah fisik setiap barang atau ekspor data untuk opname offline.</p>
            </div>
             <Dropdown trigger={<button style={{...styles.button, ...styles.buttonOutline}} disabled={isGeneratingPdf}>{isGeneratingPdf && <div className="spinner" style={{width: '16px', height: '16px', borderTopColor: 'var(--text-secondary)'}}></div>}{isGeneratingPdf ? 'Membuat PDF...' : 'Cetak Cek Offline'} &#9662;</button>} menuItems={exportMenuItems} />
        </div>
        <div style={styles.card} ref={opnameFormRef}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Pemeriksaan Barang</h3>
            <div className="responsive-table-wrapper">
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Nama</th><th style={styles.th}>STOK AWAL</th><th style={styles.th}>STOK TERKINI</th><th style={styles.th}>Selisih</th><th style={styles.th}>Satuan</th></tr></thead>
                    <tbody>{itemsWithDetails.map(item => (<tr key={item.id}><td style={styles.td}>{item.name}</td><td style={styles.td}>{item.recordedStock}</td><td style={styles.td}><input type="number" style={{...styles.input, ...styles.opnameInput}} className="opname-input-style" value={opnameData[item.id] ?? ''} onChange={e => handleCountChange(item.id, e.target.value)} min="0" /></td><td style={styles.td}></td><td style={styles.td}>{item.sellingUnitName}</td></tr>))}</tbody>
                </table>
            </div>
            <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '1.25rem' }}>Pemeriksaan Aset</h3>
            <div className="responsive-table-wrapper">
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Aset</th><th style={styles.th}>Kondisi Awal</th><th style={styles.th}>Kondisi Baru</th></tr></thead>
                    <tbody>{store.assets.sort((a,b) => a.name.localeCompare(b.name)).map(asset => (
                        <tr key={asset.id}>
                            <td style={styles.td}>{asset.name}</td>
                            <td style={styles.td}>{asset.condition}</td>
                            <td style={styles.td}>
                                <select style={{...styles.select, maxWidth: '200px'}} className="asset-condition-select" value={assetConditions[asset.id] || 'Normal'} onChange={e => handleConditionChange(asset.id, e.target.value as Asset['condition'])}>
                                    <option value="Bagus">Bagus</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Rusak">Rusak</option>
                                </select>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            <div style={{...styles.inlineFlex, marginTop: '24px', justifyContent: 'flex-end', gap: '12px' }} className="responsive-header-actions opname-actions-footer">
                <button onClick={onCancel} style={{...styles.button, ...styles.buttonOutline}}>Batal</button>
                <button onClick={handleSubmitClick} style={{...styles.button, ...styles.buttonSuccess}}>Cek Sekarang</button>
            </div>
        </div>
    </>;
};