


import React, { useMemo, useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { OpnameSession, Store } from '../../types/data';
import { styles } from '../../styles';
import { Dropdown } from '../common/Dropdown';
import { createAndDownloadExcel, SheetRequest } from '../../utils/exportUtils';

interface OpnameReportViewProps { report: OpnameSession; stores: Store[]; onClose: () => void; }

export const OpnameReportView: React.FC<OpnameReportViewProps> = ({ report, stores, onClose }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const storeName = stores.find(s => s.id === report.storeId)?.name || 'Toko tidak ditemukan';
    const renderDiscrepancy = (d: number) => d > 0 ? <span style={styles.discrepancyPositive}>+{d}</span> : (d < 0 ? <span style={styles.discrepancyNegative}>{d}</span> : <span>0</span>);
    
    const itemSummary = useMemo(() => {
        const totalItems = report.items.length;
        
        const totalSurplusQuantity = report.items
            .filter(i => i.discrepancy > 0)
            .reduce((sum, item) => sum + item.discrepancy, 0);
            
        const totalShortageQuantity = report.items
            .filter(i => i.discrepancy < 0)
            .reduce((sum, item) => sum + Math.abs(item.discrepancy), 0);

        const totalMatchedItems = report.items.filter(i => i.discrepancy === 0).length;
        
        return {
            total: totalItems,
            surplus: totalSurplusQuantity,
            shortage: totalShortageQuantity,
            match: totalMatchedItems,
        };
    }, [report.items]);

    const assetSummary = useMemo(() => {
        const totalChecked = stores.find(s => s.id === report.storeId)?.assets.length ?? 0;
        const changed = report.assetChanges.length;
        const becameRusak = report.assetChanges.filter(c => c.newCondition === 'Rusak').length;
        return { totalChecked, changed, becameRusak };
    }, [report.assetChanges, report.storeId, stores]);
    
    const handleExportToExcel = useCallback(() => {
        const itemsData = report.items.map(item => ({ 
            'Nama': item.itemName, 'Stok Awal': item.initialStock, 'Hitungan Fisik': item.physicalCount, 
            'Selisih': item.discrepancy, 'Satuan': item.unit 
        }));

        const assetsData = report.assetChanges.map(change => ({ 
            'Aset': change.assetName, 'Kondisi Awal': change.oldCondition, 'Kondisi Baru': change.newCondition 
        }));

        const sheetRequests: SheetRequest[] = [
            { sheetName: "Hasil Cek Barang", data: itemsData },
            // This sheet will only be created if there are asset changes
            { sheetName: "Hasil Cek Aset", data: assetsData } 
        ];

        const fileName = `${storeName}-Laporan_Stock_Opname.xlsx`;
        createAndDownloadExcel(sheetRequests, fileName);
    }, [report, storeName]);

    const handlePrintToPdf = useCallback(() => {
        if (!reportRef.current) return;
        setIsGeneratingPdf(true);
        const reportElement = reportRef.current;
        html2canvas(reportElement, { scale: 2, useCORS: true, logging: false })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;

                // Adjust image dimensions to fit within the page with a margin
                let imgWidth = pdfWidth - 20; 
                let imgHeight = imgWidth / ratio;
                let isPageOverflow = imgHeight > pdfHeight - 20;

                if (isPageOverflow) {
                    imgHeight = pdfHeight - 20;
                    imgWidth = imgHeight * ratio;
                }

                const x = (pdfWidth - imgWidth) / 2;
                const y = 10;
                
                pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

                pdf.save(`${storeName}-Laporan_Stock_Opname.pdf`);
            })
            .catch(err => { console.error("Error generating PDF:", err); alert("Gagal membuat PDF. Silakan coba lagi."); })
            .finally(() => { setIsGeneratingPdf(false); });
    }, [storeName]);
    const printMenuItems = [
        { label: 'Cetak ke Printer', onClick: () => window.print() },
        { label: 'Ekspor ke PDF', onClick: handlePrintToPdf },
        { label: 'Ekspor ke Excel', onClick: handleExportToExcel },
    ];

    return <>
        <div style={styles.headerActions} className="responsive-header-actions">
             <h2 style={styles.header} className="header-style">Laporan Stock Opname</h2>
             <div style={{...styles.inlineFlex}} className="no-print button-group">
                <Dropdown trigger={<button style={{...styles.button, ...styles.buttonOutline}} disabled={isGeneratingPdf}>{isGeneratingPdf && <div className="spinner" style={{width: '16px', height: '16px', borderTopColor: 'var(--text-secondary)'}}></div>}{isGeneratingPdf ? 'Membuat PDF...' : 'Ekspor & Cetak'} &#9662;</button>} menuItems={printMenuItems} />
                <button onClick={onClose} style={{...styles.button, ...styles.buttonPrimary}}>Kembali</button>
            </div>
        </div>
        <div style={styles.card} ref={reportRef}>
            <div>
                <h3 style={{margin: 0, fontSize: '1.25rem'}}>Laporan untuk {storeName}</h3>
                <p style={{margin: '4px 0 0 0', color: 'var(--text-secondary)'}}>Tanggal Opname: {new Date(report.date).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
            <h4 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Hasil Pemeriksaan Barang</h4>
            <div style={{display: 'flex', gap: '16px', marginBottom: '16px', padding: '20px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)' }} className="summary-flex">
                <div style={{flex: 1}}><strong>Total Barang:</strong> {itemSummary.total}</div>
                <div style={{flex: 1, fontWeight: 'bold'}}><strong>Sesuai:</strong> {itemSummary.match}</div>
                <div style={{flex: 1, ...styles.discrepancyPositive}}><strong>Lebih:</strong> {itemSummary.surplus}</div>
                <div style={{flex: 1, ...styles.discrepancyNegative}}><strong>Kurang:</strong> {itemSummary.shortage}</div>
            </div>
             <div className="responsive-table-wrapper">
                 <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Nama</th><th style={styles.th}>Stok Awal</th><th style={styles.th}>Hitungan Fisik</th><th style={styles.th}>Selisih</th><th style={styles.th}>Satuan</th></tr></thead>
                    <tbody>{report.items.map(item => (<tr key={item.itemId}><td style={styles.td}>{item.itemName}</td><td style={styles.td}>{item.initialStock}</td><td style={styles.td}>{item.physicalCount}</td><td style={styles.td}>{renderDiscrepancy(item.discrepancy)}</td><td style={styles.td}>{item.unit}</td></tr>))}</tbody>
                </table>
            </div>
            <h4 style={{ fontSize: '1.1rem', marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Hasil Pemeriksaan Aset</h4>
            <div style={{display: 'flex', gap: '16px', marginBottom: '16px', padding: '20px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)' }} className="summary-flex">
                <div style={{flex: 1}}><strong>Total Aset Dicek:</strong> {assetSummary.totalChecked}</div>
                <div style={{flex: 1}}><strong>Kondisi Berubah:</strong> {assetSummary.changed}</div>
                <div style={{flex: 1, ...styles.discrepancyNegative}}><strong>Menjadi Rusak:</strong> {assetSummary.becameRusak}</div>
            </div>
            {report.assetChanges.length > 0 &&
                <div className="responsive-table-wrapper">
                    <table style={styles.table}>
                        <thead><tr><th style={styles.th}>Aset</th><th style={styles.th}>Kondisi Awal</th><th style={styles.th}>Kondisi Baru</th></tr></thead>
                        <tbody>{report.assetChanges.map(change => (<tr key={change.assetId}><td style={styles.td}>{change.assetName}</td><td style={styles.td}>{change.oldCondition}</td><td style={styles.td}><span style={{fontWeight: 'bold', color: change.newCondition === 'Rusak' ? 'var(--danger-color)' : 'inherit'}}>{change.newCondition}</span></td></tr>))}</tbody>
                    </table>
                </div>
            }
        </div>
    </>;
};