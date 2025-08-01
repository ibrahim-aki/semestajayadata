


import React, { useState, useMemo, useCallback } from 'react';
import { Store, CashFlowEntry } from '../../types/data';
import { styles } from '../../styles';
import { ConfirmModal } from '../common/Modals';
import { TrashIcon, WalletIcon, LandmarkIcon, AlertTriangleIcon } from '../common/Icons';

interface CashFlowViewProps { store: Store; onStoreUpdate: (store: Store) => void; }
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

const InfoCard: React.FC<{ label: string; value: string; subvalue?: string; color?: string; icon?: React.ReactNode;}> = ({ label, value, subvalue, color = 'var(--text-primary)', icon }) => (
    <div style={{flex: 1, padding: '16px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)', borderLeft: icon ? 'none' : `4px solid ${color}`, display: 'flex', gap: '16px', alignItems: 'center', minWidth: '200px'}}>
        {icon && <div style={{ color }}>{icon}</div>}
        <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: color }}>{value}</h4>
            {subvalue && <p style={{margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{subvalue}</p>}
        </div>
    </div>
);

export const CashFlowView: React.FC<CashFlowViewProps> = ({ store, onStoreUpdate }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    
    const formatDate = (date: Date): string => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const emptyForm = { date: formatDate(today), amount: '', description: '' };
    const [formData, setFormData] = useState(emptyForm);
    const [deletingEntry, setDeletingEntry] = useState<CashFlowEntry | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    const formatNumberWithDots = (value: string | number) => String(value).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const parseNumberWithDots = (value: string) => value.replace(/\./g, '');

    const handleRecalculateCapitalAndProfit = useCallback((updatedCashFlow: CashFlowEntry[], currentStore: Store) => {
        const sortedFlow = updatedCashFlow.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const monthlyCosts = currentStore.costs
            .filter(c => c.frequency === 'tahunan')
            .reduce((sum, c) => sum + c.amount, 0) / 12;

        const oneTimeCostsForCapital = currentStore.costs
            .filter(c => c.frequency === 'tahunan' || c.frequency === 'sekali')
            .reduce((sum, c) => sum + c.amount, 0);

        const initialStockValue = currentStore.items.reduce((acc, item) => acc + (item.purchasePrice * (currentStore.inventory.find(inv => inv.itemId === item.id)?.recordedStock || 0)), 0);
        const initialAssetValue = currentStore.assets.reduce((acc, asset) => acc + asset.value, 0);
        const initialCapital = initialStockValue + initialAssetValue + oneTimeCostsForCapital;

        const totalInvestorShare = currentStore.investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
        const ownerSharePercentage = Math.max(0, 100 - totalInvestorShare) / 100;

        const incomeByMonth: { [key: string]: number } = {};
        sortedFlow.forEach(entry => {
            const monthKey = entry.date.substring(0, 7); // YYYY-MM
            incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + entry.amount;
        });

        let cumulativeCapitalRecouped = 0;
        let cumulativeNetProfit = 0;

        const sortedMonths = Object.keys(incomeByMonth).sort();

        for (const monthKey of sortedMonths) {
            const monthlyIncome = incomeByMonth[monthKey];
            const grossProfit = monthlyIncome - monthlyCosts;
            const myShare = grossProfit > 0 ? grossProfit * ownerSharePercentage : 0;
            
            if (cumulativeCapitalRecouped < initialCapital) {
                const neededToRecoup = initialCapital - cumulativeCapitalRecouped;
                const toRecoupThisMonth = Math.min(myShare, neededToRecoup);
                cumulativeCapitalRecouped += toRecoupThisMonth;
                
                const profitThisMonth = myShare - toRecoupThisMonth;
                cumulativeNetProfit += profitThisMonth;
            } else {
                cumulativeNetProfit += myShare;
            }
        }
        return { capitalRecouped: cumulativeCapitalRecouped, netProfit: cumulativeNetProfit };
    }, []);

    const handleAddIncome = (e: React.FormEvent) => {
        e.preventDefault();
        
        const amount = parseFloat(parseNumberWithDots(formData.amount));
        if (!formData.date || isNaN(amount) || amount <= 0) {
            alert("Tanggal dan Jumlah Pemasukan harus diisi dengan benar.");
            return;
        }
        const newEntry: CashFlowEntry = { id: generateId('CF'), ...formData, amount };
        const updatedCashFlow = [...store.cashFlow, newEntry];
        const { capitalRecouped, netProfit } = handleRecalculateCapitalAndProfit(updatedCashFlow, store);
        
        onStoreUpdate({ ...store, cashFlow: updatedCashFlow, capitalRecouped, netProfit });
        
        const lastDate = new Date(formData.date + 'T00:00:00');
        lastDate.setDate(lastDate.getDate() + 1);
        const nextDayString = formatDate(lastDate);

        setFormData({ ...emptyForm, date: nextDayString });
    };
    
    const handleDeleteIncome = () => {
        if (!deletingEntry) return;
        const updatedCashFlow = store.cashFlow.filter(entry => entry.id !== deletingEntry.id);
        const { capitalRecouped, netProfit } = handleRecalculateCapitalAndProfit(updatedCashFlow, store);

        onStoreUpdate({ ...store, cashFlow: updatedCashFlow, capitalRecouped, netProfit });
        setDeletingEntry(null);
    };

    const { monthlyReport, capitalReport, shareReport } = useMemo(() => {
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const monthKey = `${selectedYear}-${monthStr}`;

        const totalMonthlyIncome = store.cashFlow
            .filter(entry => entry.date.startsWith(monthKey))
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        const totalAnnualCostForReport = store.costs.filter(c => c.frequency === 'tahunan').reduce((sum, c) => sum + c.amount, 0);
        const monthlyOperationalCost = totalAnnualCostForReport / 12;
        const grossProfit = totalMonthlyIncome - monthlyOperationalCost;

        const totalInvestorShare = store.investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
        const ownerSharePercentage = Math.max(0, 100 - totalInvestorShare);
        
        const ownerShareAmount = grossProfit > 0 ? grossProfit * (ownerSharePercentage / 100) : 0;
        const investorShares = store.investors.map(inv => ({
            ...inv,
            shareAmount: grossProfit > 0 ? grossProfit * (inv.sharePercentage / 100) : 0,
        }));

        const totalStockValue = store.inventory.reduce((acc, inv) => {
            const item = store.items.find(i => i.id === inv.itemId);
            return acc + (item ? inv.recordedStock * item.purchasePrice : 0);
        }, 0);
        const totalAssetValue = store.assets.reduce((acc, asset) => acc + asset.value, 0);

        const oneTimeCostsForCapital = store.costs
            .filter(c => c.frequency === 'tahunan' || c.frequency === 'sekali')
            .reduce((sum, c) => sum + c.amount, 0);
            
        const initialCapital = totalStockValue + totalAssetValue + oneTimeCostsForCapital;
        const remainingCapital = Math.max(0, initialCapital - store.capitalRecouped);

        return {
            monthlyReport: { totalMonthlyIncome, monthlyOperationalCost, grossProfit },
            capitalReport: { initialCapital, remainingCapital },
            shareReport: { ownerSharePercentage, ownerShareAmount, investorShares, totalInvestorShare }
        };
    }, [store, selectedMonth, selectedYear]);

    const filteredEntries = useMemo(() => {
         const monthStr = String(selectedMonth + 1).padStart(2, '0');
         const monthKey = `${selectedYear}-${monthStr}`;
         return store.cashFlow
            .filter(entry => entry.date.startsWith(monthKey))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [store.cashFlow, selectedMonth, selectedYear]);

    const monthOptions = Array.from({length: 12}, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('id-ID', { month: 'long' }) }));
    const yearOptions = Array.from({length: 10}, (_, i) => today.getFullYear() - i);

    return <>
        <ConfirmModal isOpen={!!deletingEntry} onClose={() => setDeletingEntry(null)} onConfirm={handleDeleteIncome} title="Hapus Pemasukan?" >
            <p>Yakin ingin menghapus catatan pemasukan ini? Tindakan ini akan memengaruhi perhitungan laba dan modal.</p>
        </ConfirmModal>

        {/* Input Form */}
        <div style={{...styles.card, marginBottom: '24px'}}>
            <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.25rem'}}>Input Pemasukan Harian</h3>
            <form onSubmit={handleAddIncome} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '16px', alignItems: 'flex-end'}} className="responsive-form-grid">
                <div><label htmlFor="income-date" style={styles.formLabel}>Tanggal</label><input type="date" id="income-date" style={styles.input} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required /></div>
                <div><label htmlFor="income-amount" style={styles.formLabel}>Jumlah (Rp)</label><input type="text" id="income-amount" style={styles.input} value={formatNumberWithDots(formData.amount)} onChange={e => setFormData({...formData, amount: e.target.value})} required /></div>
                <div><label htmlFor="income-desc" style={styles.formLabel}>Keterangan</label><input type="text" id="income-desc" style={styles.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                <div><button type="submit" style={{...styles.button, ...styles.buttonPrimary}}>Tambah</button></div>
            </form>
        </div>

        {/* Reports */}
        <div style={{...styles.card}}>
            <div style={{...styles.inlineFlex, justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap'}}>
                <h3 style={{marginTop: 0, marginBottom: 0, fontSize: '1.25rem'}}>Laporan Arus Kas</h3>
                <div style={{...styles.inlineFlex, gap: '16px'}}>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={styles.select}>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={styles.select}>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
            </div>

            {/* Monthly Report Cards */}
            <div style={{display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap'}}>
                <InfoCard label="Total Pemasukan" value={formatCurrency(monthlyReport.totalMonthlyIncome)} color="var(--success-color)" />
                <InfoCard label="Biaya Tahunan (/12)" value={formatCurrency(monthlyReport.monthlyOperationalCost)} color="var(--danger-color)" />
                <InfoCard label="Laba Kotor" value={formatCurrency(monthlyReport.grossProfit)} color="var(--primary-color)" />
            </div>

            {/* Share Distribution */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginBottom: '24px'}}>
                 <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Pembagian Hasil Bulan Ini</h4>
                 {shareReport.totalInvestorShare > 100 && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)'}}>
                         <AlertTriangleIcon size={18} />
                         <span style={{fontWeight: 600}}>Peringatan: Total saham investor ({shareReport.totalInvestorShare}%) melebihi 100%.</span>
                     </div>
                 )}
                <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                    <InfoCard label={`Bagian Pemilik (${shareReport.ownerSharePercentage.toFixed(1)}%)`} value={formatCurrency(shareReport.ownerShareAmount)} />
                    {shareReport.investorShares.map(inv => (
                        <InfoCard key={inv.id} label={`Bagian ${inv.name} (${inv.sharePercentage}%)`} value={formatCurrency(inv.shareAmount)} />
                    ))}
                </div>
            </div>

             {/* Capital Status Report Cards */}
            <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)'}}>
                 <InfoCard icon={<LandmarkIcon size={24}/>} label="Modal Awal" value={formatCurrency(capitalReport.initialCapital)} color="#4f46e5" />
                 <InfoCard icon={<WalletIcon size={24}/>} label="Modal Tertutupi" value={formatCurrency(store.capitalRecouped)} color="#10b981" />
                 <InfoCard icon={<WalletIcon size={24}/>} label="Sisa Modal" value={formatCurrency(capitalReport.remainingCapital)} color="#d97706"/>
                 <InfoCard icon={<WalletIcon size={24}/>} label="Total Laba Bersih" value={formatCurrency(store.netProfit)} subvalue="(setelah modal kembali)" color="#3b82f6"/>
            </div>

             {/* Entries Table */}
             <div className="responsive-table-wrapper" style={{marginTop: '24px'}}>
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Tanggal</th><th style={styles.th}>Keterangan</th><th style={styles.th}>Jumlah</th><th style={styles.th}>Aksi</th></tr></thead>
                    <tbody>
                        {filteredEntries.length > 0 ? filteredEntries.map(entry => (
                            <tr key={entry.id}>
                                <td style={styles.td}>{new Date(entry.date + 'T00:00:00').toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td>
                                <td style={styles.td}>{entry.description}</td>
                                <td style={styles.td}>{formatCurrency(entry.amount)}</td>
                                <td style={styles.td}><button onClick={() => setDeletingEntry(entry)} style={{...styles.button, ...styles.buttonDanger, ...styles.buttonIconSmall}} title="Hapus"><TrashIcon/></button></td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} style={{...styles.td, textAlign: 'center', color: 'var(--text-secondary)'}}>Tidak ada data pemasukan untuk bulan ini.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </>;
};
