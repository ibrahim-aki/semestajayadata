


import React, { useMemo } from 'react';
import { Store, OpnameSession, Item } from '../../types/data';
import { styles } from '../../styles';
import { BoxIcon, ArchiveIcon, WalletIcon, AlertTriangleIcon, CheckCircleIcon, ArrowRightIcon, LandmarkIcon } from '../common/Icons';

const LOW_STOCK_THRESHOLD = 5;

interface StoreSummaryViewProps {
    store: Store;
    latestOpname: OpnameSession | undefined;
    onViewReport: (report: OpnameSession) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; }> = ({ icon, label, value, color }) => {
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-content)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 0px', minWidth: '200px',
    };
    const iconContainerStyle: React.CSSProperties = {
        backgroundColor: color, borderRadius: '50%', width: '48px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    };
    return (
        <div style={cardStyle}>
            <div style={iconContainerStyle}>{icon}</div>
            <div>
                <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{value}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{label}</p>
            </div>
        </div>
    );
};

export const StoreSummaryView: React.FC<StoreSummaryViewProps> = ({ store, latestOpname, onViewReport }) => {

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const { totalValue, totalStockValue, totalAssetValue, totalDailyCost, totalMonthlyCost, totalAnnualCost } = useMemo(() => {
        const stockValue = store.inventory.reduce((acc, inv) => {
            const item = store.items.find(i => i.id === inv.itemId);
            return acc + (item ? inv.recordedStock * item.purchasePrice : 0);
        }, 0);

        const assetValue = store.assets.reduce((acc, asset) => acc + asset.value, 0);
        
        const annualCost = store.costs.reduce((acc, cost) => {
            let annualEquivalent = 0;
            switch (cost.frequency) {
                case 'harian': annualEquivalent = cost.amount * 365; break;
                case 'mingguan': annualEquivalent = cost.amount * 52; break; 
                case 'bulanan': annualEquivalent = cost.amount * 12; break;
                case 'tahunan': annualEquivalent = cost.amount; break;
            }
            return acc + annualEquivalent;
        }, 0);
        
        const monthlyCost = annualCost / 12;
        const dailyCost = annualCost / 365;

        return { 
            totalValue: stockValue + assetValue, 
            totalStockValue: stockValue, 
            totalAssetValue: assetValue, 
            totalDailyCost: dailyCost, 
            totalMonthlyCost: monthlyCost, 
            totalAnnualCost: annualCost 
        };
    }, [store]);
    
    const lowStockItems = useMemo(() => {
        return store.inventory
            .filter(inv => inv.recordedStock <= LOW_STOCK_THRESHOLD)
            .map(inv => {
                const item = store.items.find(i => i.id === inv.itemId);
                if (!item) return null; // Check for item existence to prevent crash
                return { ...item, recordedStock: inv.recordedStock };
            })
            // Filter out any null entries where an item was not found.
            .filter((item): item is (Item & { recordedStock: number }) => item !== null) 
            .sort((a,b) => a.recordedStock - b.recordedStock);
    }, [store.inventory, store.items]);

    const assetConditions = useMemo(() => {
        const conditions: { [key in 'Bagus' | 'Normal' | 'Rusak']: number } = { 'Bagus': 0, 'Normal': 0, 'Rusak': 0 };
        store.assets.forEach(asset => {
            conditions[asset.condition] = (conditions[asset.condition] || 0) + 1;
        });
        return conditions;
    }, [store.assets]);

    const opnameSummary = useMemo(() => {
        if (!latestOpname) return null;
        
        const surplus = latestOpname.items
            .filter(i => i.discrepancy > 0)
            .reduce((sum, item) => sum + item.discrepancy, 0);
            
        const shortage = latestOpname.items
            .filter(i => i.discrepancy < 0)
            .reduce((sum, item) => sum + Math.abs(item.discrepancy), 0);

        const match = latestOpname.items.filter(i => i.discrepancy === 0).length;

        return { surplus, shortage, match };
    }, [latestOpname]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                <StatCard icon={<LandmarkIcon size={24} />} label="Total Nilai (Stok + Aset)" value={formatCurrency(totalValue)} color="#4f46e5" />
                <StatCard icon={<BoxIcon size={24} />} label="Total Nilai Stok" value={formatCurrency(totalStockValue)} color="#3b82f6" />
                <StatCard icon={<ArchiveIcon size={24} />} label="Total Nilai Aset" value={formatCurrency(totalAssetValue)} color="#10b981" />
                <StatCard icon={<WalletIcon size={24} />} label="Estimasi Biaya /Hari" value={formatCurrency(totalDailyCost)} color="#d97706" />
                <StatCard icon={<WalletIcon size={24} />} label="Estimasi Biaya /bln" value={formatCurrency(totalMonthlyCost)} color="#f97316" />
                <StatCard icon={<WalletIcon size={24} />} label="Estimasi Biaya /thn" value={formatCurrency(totalAnnualCost)} color="#eab308" />
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

                {/* Last Opname Report */}
                <div style={{...styles.card, padding: '24px', display: 'flex', flexDirection: 'column'}}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>Laporan Cek Terakhir</h3>
                    {latestOpname && opnameSummary ? (
                        <>
                            <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
                                Dilakukan pada {new Date(latestOpname.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                            </p>
                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', textAlign: 'center', marginBottom: '24px' }}>
                                <div><div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)'}}>{opnameSummary.match}</div><div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Sesuai</div></div>
                                <div><div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)'}}>{opnameSummary.surplus}</div><div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Lebih</div></div>
                                <div><div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)'}}>{opnameSummary.shortage}</div><div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Kurang</div></div>
                            </div>
                             <button onClick={() => onViewReport(latestOpname)} style={{...styles.button, ...styles.buttonOutline, marginTop: 'auto', width: '100%', justifyContent: 'center'}}>
                                Lihat Laporan Lengkap <ArrowRightIcon />
                            </button>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)'}}>
                            <CheckCircleIcon size={32} color="var(--text-secondary)" />
                            <p style={{margin: '12px 0 0 0', color: 'var(--text-secondary)'}}>Belum ada riwayat pengecekan. Mulai cek untuk melihat laporan di sini.</p>
                        </div>
                    )}
                </div>

                {/* Low Stock Items */}
                <div style={{...styles.card, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>Perlu Restock (Stok &le; {LOW_STOCK_THRESHOLD})</h3>
                    {lowStockItems.length > 0 ? (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', maxHeight: '250px' }}>
                            {lowStockItems.map(item => (
                                <li key={item!.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span>{item!.name}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--danger-color)' }}>
                                        Sisa {item!.recordedStock} {store.units.find(u => u.id === item!.sellingUnitId)?.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                           <CheckCircleIcon size={32} color="var(--success-color)" />
                           <p style={{margin: '12px 0 0 0', color: 'var(--text-secondary)'}}>Stok semua barang aman!</p>
                        </div>
                    )}
                </div>
                
                {/* Asset Conditions */}
                <div style={{...styles.card, padding: '24px', display: 'flex', flexDirection: 'column'}}>
                     <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>Ringkasan Kondisi Aset</h3>
                     {store.assets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Object.entries(assetConditions).map(([condition, count]) => (
                                <div key={condition} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{condition}</span>
                                    <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{count} Aset</span>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-header)', borderRadius: 'var(--radius-md)', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                             <AlertTriangleIcon size={32} color="var(--text-secondary)" />
                            <p style={{margin: '12px 0 0 0', color: 'var(--text-secondary)'}}>Belum ada data aset yang ditambahkan.</p>
                        </div>
                     )}
                </div>

            </div>
        </div>
    );
};