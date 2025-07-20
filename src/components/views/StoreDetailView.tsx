
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Store, Asset, OpnameSession, Item } from '../../types/data';
import { styles } from '../../styles';
import { Dropdown } from '../common/Dropdown';
import { InfoModal } from '../common/Modals';
import { StoreItemsView } from '../store/StoreItemsView';
import { StoreAssetsView } from '../store/StoreAssetsView';
import { StoreCostsView } from '../store/StoreCostsView';
import { StoreInvestorsView } from '../store/StoreInvestorsView';
import { StoreSummaryView } from './StoreSummaryView';
import { CashFlowView } from './CashFlowView';
import { MoreVertIcon, PlayIcon, ImportIcon, ExportIcon } from '../common/Icons';
import { createAndDownloadExcel, SheetRequest } from '../../utils/exportUtils';
import ExcelJS from 'exceljs';

const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

interface StoreDetailViewProps {
    store: Store;
    onStoreUpdate: (store: Store) => void;
    onBack: () => void;
    onStartOpname: () => void;
    opnameHistory: OpnameSession[];
    onViewReport: (report: OpnameSession) => void;
}

export const StoreDetailView: React.FC<StoreDetailViewProps> = ({ store, onStoreUpdate, onBack, onStartOpname, opnameHistory, onViewReport }) => {
    const [activeTab, setActiveTab] = useState('summary');
    const [isImporting, setIsImporting] = useState(false);
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
    const importFileRef = useRef<HTMLInputElement>(null);
    

    const latestOpname = useMemo(() => {
        return opnameHistory
            .filter(session => session.storeId === store.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [opnameHistory, store.id]);

    const handleExport = useCallback((type: 'current' | 'all') => {
        const sheetRequests: SheetRequest[] = [];
        
        const sheetDataMap = {
            items: {
                name: "Barang",
                data: store.items.map(item => ({
                    'SKU': item.sku, 'Nama': item.name, 'Keterangan': item.description,
                    'Kategori': store.itemCategories.find(c => c.id === item.categoryId)?.name ?? '',
                    'Satuan Beli': store.units.find(u => u.id === item.purchaseUnitId)?.name ?? '',
                    'Isi Konversi': item.conversionRate > 1 ? item.conversionRate : '',
                    'Satuan Jual': store.units.find(u => u.id === item.sellingUnitId)?.name ?? '',
                    'Stok (Satuan Jual)': store.inventory.find(inv => inv.itemId === item.id)?.recordedStock ?? 0,
                    'Harga Beli (Satuan Beli)': item.conversionRate > 1 ? item.purchasePrice * item.conversionRate : item.purchasePrice,
                    'Harga Beli (Satuan Jual)': item.purchasePrice,
                    'Harga Jual': item.sellingPrice
                }))
            },
            assets: {
                name: "Aset",
                data: store.assets.map(asset => ({
                    'Kode': asset.code, 'Aset': asset.name, 'Keterangan': asset.description,
                    'Kategori': store.assetCategories.find(c => c.id === asset.categoryId)?.name ?? '',
                    'Kondisi': asset.condition, 'Tgl Perolehan': asset.purchaseDate, 'Nilai': asset.value
                }))
            },
            costs: {
                name: "Biaya",
                data: store.costs.map(c => ({
                    'Biaya': c.name, 'Keterangan': c.description, 'Jumlah': c.amount, 'Frekuensi': c.frequency
                }))
            },
            investors: {
                name: "Investor",
                data: store.investors.map(inv => ({
                    'Nama': inv.name, 'Persentase Saham (%)': inv.sharePercentage
                }))
            },
            cashflow: {
                 name: "Arus Kas",
                 data: store.cashFlow.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(cf => ({
                    'Tanggal': cf.date, 'Jumlah': cf.amount, 'Keterangan': cf.description
                 }))
            }
        };

        if (type === 'all') {
            (Object.keys(sheetDataMap) as Array<keyof typeof sheetDataMap>).forEach(key => {
                 if (sheetDataMap[key].data.length > 0) {
                    sheetRequests.push({ sheetName: sheetDataMap[key].name, data: sheetDataMap[key].data });
                 }
            });
            createAndDownloadExcel(sheetRequests, `${store.name}-Semua Data.xlsx`);
        } else if (activeTab !== 'summary') {
            const tabKey = activeTab as keyof typeof sheetDataMap;
            sheetRequests.push({ sheetName: sheetDataMap[tabKey].name, data: sheetDataMap[tabKey].data });
            createAndDownloadExcel(sheetRequests, `${store.name}-${sheetDataMap[tabKey].name}.xlsx`);
        }
    }, [store, activeTab]);

    const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, type: 'current' | 'all') => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const buffer = e.target!.result as ArrayBuffer;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);

                let updated = 0, added = 0;
                const targetStore = JSON.parse(JSON.stringify(store)); // Deep copy
                const validConditions: Asset['condition'][] = ['Bagus', 'Normal', 'Rusak'];
                const validateCondition = (condStr: any): Asset['condition'] => { const str = String(condStr || '').trim(); const found = validConditions.find(c => c.toLowerCase() === str.toLowerCase()); return found || 'Normal'; };
                
                const processSheet = (worksheet: ExcelJS.Worksheet) => {
                    const sheetName = worksheet.name;
                    const headers: { [key: string]: string } = {};
                    const headerRow = worksheet.getRow(1);
                    if (!headerRow.values.length) return;
                    
                    (headerRow.values as string[]).forEach((header, index) => {
                        if (header) headers[index] = header;
                    });
                    
                    const jsonData: any[] = [];
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber > 1) {
                            const rowData: any = {};
                            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                                const header = headers[colNumber];
                                if (header) {
                                    rowData[header] = cell.value;
                                }
                            });
                           jsonData.push(rowData);
                        }
                    });

                    if(sheetName.toLowerCase().includes('barang')) {
                        jsonData.forEach(row => {
                            let category = targetStore.itemCategories.find((c: any) => c.name.toLowerCase() === (row['Kategori'] || '').toLowerCase()); if (!category && row['Kategori']) { const prefix = row['Kategori'].substring(0,3).toUpperCase(); category = { id: generateId('IC'), name: row['Kategori'], prefix }; targetStore.itemCategories.push(category); }

                            const purchaseUnitName = row['Satuan Beli'] || '';
                            const sellingUnitName = row['Satuan Jual'] || '';
                            let purchaseUnit = targetStore.units.find((u: any) => u.name.toLowerCase() === purchaseUnitName.toLowerCase()); if (!purchaseUnit && purchaseUnitName) { purchaseUnit = { id: generateId('U'), name: purchaseUnitName }; targetStore.units.push(purchaseUnit); }
                            let sellingUnit = targetStore.units.find((u: any) => u.name.toLowerCase() === sellingUnitName.toLowerCase()); if (!sellingUnit && sellingUnitName) { sellingUnit = { id: generateId('U'), name: sellingUnitName }; targetStore.units.push(sellingUnit); }
                            if (!purchaseUnit) purchaseUnit = sellingUnit;
                            if (!sellingUnit) sellingUnit = purchaseUnit;

                            const conversionRate = parseInt(row['Isi Konversi']) || 1;
                            const purchasePricePerPurchaseUnit = parseFloat(row['Harga Beli (Satuan Beli)']) || 0;
                            const purchasePricePerSellingUnitFromSheet = parseFloat(row['Harga Beli (Satuan Jual)']) || 0;
                            let finalPurchasePricePerSellingUnit = 0;
                            if (purchasePricePerSellingUnitFromSheet > 0) { finalPurchasePricePerSellingUnit = purchasePricePerSellingUnitFromSheet; }
                            else if (purchasePricePerPurchaseUnit > 0 && conversionRate > 0) { finalPurchasePricePerSellingUnit = purchasePricePerPurchaseUnit / conversionRate; }

                            const existingItemIndex = targetStore.items.findIndex((i: any) => i.sku === row['SKU']);
                            const itemData: Omit<Item, 'id' | 'sku'> = {
                                name: row['Nama'], description: row['Keterangan'] || '', categoryId: category?.id,
                                sellingUnitId: sellingUnit?.id, purchaseUnitId: purchaseUnit?.id, conversionRate: conversionRate,
                                purchasePrice: finalPurchasePricePerSellingUnit, sellingPrice: parseFloat(row['Harga Jual']) || 0,
                            };
                            if (existingItemIndex > -1) { const existingItem = targetStore.items[existingItemIndex]; targetStore.items[existingItemIndex] = { ...existingItem, ...itemData }; const invIndex = targetStore.inventory.findIndex((inv: any) => inv.itemId === existingItem.id); if (invIndex > -1) targetStore.inventory[invIndex].recordedStock = parseInt(row['Stok (Satuan Jual)']) || targetStore.inventory[invIndex].recordedStock; updated++; } 
                            else { const newItem = { ...itemData, id: generateId(`${store.id}-ITM`), sku: row['SKU'] || `${category?.prefix || 'BRG'}-${String(targetStore.items.length + 1).padStart(3, '0')}` }; targetStore.items.push(newItem); targetStore.inventory.push({ itemId: newItem.id, recordedStock: parseInt(row['Stok (Satuan Jual)']) || 0 }); added++; }
                        });
                    } else if(sheetName.toLowerCase().includes('aset')) {
                         jsonData.forEach(row => {
                            let category = targetStore.assetCategories.find((c: any) => c.name.toLowerCase() === (row['Kategori'] || '').toLowerCase()); if (!category && row['Kategori']) { const prefix = row['Kategori'].substring(0,3).toUpperCase(); category = { id: generateId('AC'), name: row['Kategori'], prefix }; targetStore.assetCategories.push(category); }
                            
                            const purchaseDateValue = row['Tgl Perolehan'];
                            let formattedDate = new Date().toISOString().split('T')[0]; // Default to today
                            if (purchaseDateValue instanceof Date && !isNaN(purchaseDateValue.getTime())) {
                                formattedDate = purchaseDateValue.toISOString().split('T')[0];
                            }
                            
                            const existingAssetIndex = targetStore.assets.findIndex((a: any) => a.code === row['Kode']);
                            const assetData = { name: row['Aset'], description: row['Keterangan'] || '', categoryId: category?.id, purchaseDate: formattedDate, value: parseFloat(row['Nilai']) || 0, condition: validateCondition(row['Kondisi']) };
                            if(existingAssetIndex > -1) { targetStore.assets[existingAssetIndex] = { ...targetStore.assets[existingAssetIndex], ...assetData }; updated++; } 
                            else { targetStore.assets.push({ ...assetData, id: generateId(`${store.id}-AST`), code: row['Kode'] || `${category?.prefix || 'AST'}-${String(targetStore.assets.length + 1).padStart(3, '0')}` }); added++; }
                         });
                    } else if(sheetName.toLowerCase().includes('biaya')) {
                         jsonData.forEach(row => {
                            const existingCostIndex = targetStore.costs.findIndex((c: any) => c.name.toLowerCase() === (row['Biaya'] || '').toLowerCase());
                            const costData = { name: row['Biaya'], description: row['Keterangan'] || '', amount: parseFloat(row['Jumlah']) || 0, frequency: (row['Frekuensi'] || 'bulanan').toLowerCase() };
                            if (existingCostIndex > -1) { targetStore.costs[existingCostIndex] = { ...targetStore.costs[existingCostIndex], ...costData }; updated++; } 
                            else { targetStore.costs.push({ ...costData, id: generateId(`${store.id}-CST`) }); added++; }
                         });
                    }
                };
                if(type === 'all') { 
                    workbook.eachSheet(worksheet => processSheet(worksheet));
                } 
                else { 
                    const sheetMap: { [key: string]: string } = { items: 'barang', assets: 'aset', costs: 'biaya', investors: 'investor' }; 
                    const targetSheetName = sheetMap[activeTab]; 
                    const foundSheet = workbook.worksheets.find(ws => ws.name.toLowerCase().includes(targetSheetName));
                    if(foundSheet) processSheet(foundSheet);
                }
                onStoreUpdate(targetStore);
                setInfoModal({ isOpen: true, title: 'Impor Berhasil', message: `${added} data ditambahkan, ${updated} data diperbarui.` });
            } catch (error) { console.error("Error importing file:", error); setInfoModal({ isOpen: true, title: 'Impor Gagal', message: 'Terjadi kesalahan saat memproses file Anda. Pastikan format file benar.' }); } 
            finally { setIsImporting(false); if (importFileRef.current) importFileRef.current.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    }, [store, onStoreUpdate, activeTab]);

    const triggerImport = (type: 'current' | 'all') => { if (importFileRef.current) { importFileRef.current.onchange = (e) => handleFileImport(e as unknown as React.ChangeEvent<HTMLInputElement>, type); importFileRef.current.click(); } };
    const importMenuItems = [ { label: 'Impor Tab Saat Ini', onClick: () => triggerImport('current') }, { label: 'Impor Semua Data', onClick: () => triggerImport('all') }, ];
    const exportMenuItems = [ { label: 'Ekspor Tab Saat Ini', onClick: () => handleExport('current') }, { label: 'Ekspor Semua Data', onClick: () => handleExport('all') }, ];
    const mobileMenuItems = [ { label: 'Mulai Cek', icon: <PlayIcon />, onClick: onStartOpname }, { isSeparator: true }, { label: 'Impor Tab Saat Ini', icon: <ImportIcon />, onClick: () => triggerImport('current') }, { label: 'Ekspor Tab Saat Ini', icon: <ExportIcon />, onClick: () => handleExport('current') }, { isSeparator: true }, { label: 'Impor Semua Data', icon: <ImportIcon />, onClick: () => triggerImport('all') }, { label: 'Ekspor Semua Data', icon: <ExportIcon />, onClick: () => handleExport('all') }, ];
    
    const TABS: { [key: string]: { label: string; component: React.ReactNode } } = { 
        summary: { label: "Ringkasan", component: <StoreSummaryView store={store} latestOpname={latestOpname} onViewReport={onViewReport} /> },
        items: { label: "Master Barang", component: <StoreItemsView store={store} onStoreUpdate={onStoreUpdate} /> }, 
        assets: { label: "Master Aset", component: <StoreAssetsView store={store} onStoreUpdate={onStoreUpdate} /> }, 
        costs: { label: "Master Biaya", component: <StoreCostsView store={store} onStoreUpdate={onStoreUpdate} /> }, 
        investors: { label: "Master Investor", component: <StoreInvestorsView store={store} onStoreUpdate={onStoreUpdate} /> },
        cashflow: { label: "Arus Kas", component: <CashFlowView store={store} onStoreUpdate={onStoreUpdate} /> },
    };

    return <>
        <InfoModal isOpen={infoModal.isOpen} onClose={() => setInfoModal({ ...infoModal, isOpen: false })} title={infoModal.title}><p>{infoModal.message}</p></InfoModal>
        <input type="file" ref={importFileRef} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <div style={styles.headerActions} className="responsive-header-actions">
            <div><button onClick={onBack} style={{...styles.button, ...styles.buttonOutline, marginBottom: '16px'}}>&#8592; Kembali ke Daftar Toko</button><h2 style={{...styles.header, margin: 0}} className="header-style">{store.name}</h2><p style={{...styles.pageDescription, margin: '4px 0 0 0'}} className="page-description-style">Kelola data master atau mulai stock opname.</p></div>
        </div>
        <div className="tabs">{Object.entries(TABS).map(([key, {label}]) => (<button key={key} className={`tab-button ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>))}</div>
        <div style={{ marginTop: '24px' }}>{TABS[activeTab as keyof typeof TABS].component}</div>
        <div style={{ ...styles.card, marginTop: '40px', padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }} className="button-group-footer">
            <span style={{marginRight: 'auto', color: 'var(--text-secondary)', fontWeight: 600}}>Menu Aksi</span>
            {isImporting && <div className="spinner"></div>}
            <Dropdown trigger={<button style={{...styles.button, ...styles.buttonOutline}} disabled={isImporting || activeTab === 'summary'}>Impor Data &#9662;</button>} menuItems={importMenuItems} />
            <Dropdown trigger={<button style={{...styles.button, ...styles.buttonOutline}} disabled={activeTab === 'summary'}>Ekspor Data &#9662;</button>} menuItems={exportMenuItems} />
            <button onClick={onStartOpname} style={{...styles.button, ...styles.buttonSuccess}}>Mulai Cek</button>
        </div>
        <div className="fab-dropdown-container"><Dropdown trigger={<button style={{ ...styles.button, ...styles.buttonPrimary, borderRadius: '50%', width: '60px', height: '60px', padding: 0, justifyContent: 'center', boxShadow: 'var(--shadow-md)' }} title="Menu Aksi"><MoreVertIcon color="white" /></button>} menuItems={mobileMenuItems} menuPositionStyle={{ bottom: 'calc(100% + 12px)', top: 'auto', right: 0 }} /></div>
    </>;
};