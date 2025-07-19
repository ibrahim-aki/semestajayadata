import { useState, useEffect, useMemo } from 'react';
import { Store, OpnameSession } from './types/data';
import { styles } from './styles';
import { HomePage } from './components/views/HomePage';
import { StoreDetailView } from './components/views/StoreDetailView';
import { StockOpnameView } from './components/views/StockOpnameView';
import { OpnameReportView } from './components/views/OpnameReportView';
import { defaultStores } from './data/defaultData';
import { SunIcon, MoonIcon } from './components/common/Icons';
import {
    isFirebaseConfigured,
    onStoresSnapshot,
    onHistorySnapshot,
    addStore,
    updateStore,
    deleteStore,
    addOpnameSession,
} from './services/firebase';

const APP_STORAGE_KEY_THEME = 'manajemen-toko-app-theme';

export const App = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [opnameHistory, setOpnameHistory] = useState<OpnameSession[]>([]);
    const [view, setView] = useState<'home' | 'store-detail' | 'opname' | 'report'>('home');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [activeReport, setActiveReport] = useState<OpnameSession | null>(null);
    const [theme, setTheme] = useState(() => localStorage.getItem(APP_STORAGE_KEY_THEME) || 'light');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            console.warn("Firebase not configured. Running in offline mode with default data.");
            setStores(defaultStores);
            setOpnameHistory([]);
            setLoading(false);
            return;
        }

        const unsubscribeStores = onStoresSnapshot((storesData) => {
            setStores(storesData);
            setLoading(false);
        });

        const unsubscribeHistory = onHistorySnapshot((historyData) => {
            setOpnameHistory(historyData);
        });

        return () => {
            unsubscribeStores();
            unsubscribeHistory();
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(APP_STORAGE_KEY_THEME, theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);

    const handleSelectStore = (storeId: string) => { setSelectedStoreId(storeId); setView('store-detail'); };
    const handleBackToHome = () => { setSelectedStoreId(null); setView('home'); setActiveReport(null); };
    const handleStartOpname = () => { if (selectedStore) setView('opname'); };
    const handleOpnameCancel = () => setView('store-detail');
    const handleCloseReport = () => { setActiveReport(null); setView('store-detail'); };

    const handleOpnameComplete = async (report: OpnameSession) => {
        setIsSaving(true);
        await addOpnameSession(report);
        // The onSnapshot listener will update the state, but we can set the active report immediately
        setActiveReport(report);
        setView('report');
        setIsSaving(false);
    };

    const handleStoreUpdate = async (updatedStore: Store) => {
        setIsSaving(true);
        await updateStore(updatedStore);
        setIsSaving(false);
    };

    const handleAddStore = async (newStore: Store) => {
        setIsSaving(true);
        await addStore(newStore);
        setIsSaving(false);
    };

    const handleUpdateStoreInfo = async (storeId: string, data: { name: string, address: string }) => {
        const storeToUpdate = stores.find(s => s.id === storeId);
        if (storeToUpdate) {
            setIsSaving(true);
            await updateStore({ ...storeToUpdate, ...data });
            setIsSaving(false);
        }
    };
    
    const handleDeleteStore = async (storeIdToDelete: string) => {
        setIsSaving(true);
        await deleteStore(storeIdToDelete);
        if (selectedStoreId === storeIdToDelete) handleBackToHome();
        setIsSaving(false);
    };

    const handleViewReport = (report: OpnameSession) => {
        setActiveReport(report);
        setView('report');
    };
    
    const handleLoadSampleData = async () => {
        setLoading(true);
        try {
            for (const store of defaultStores) {
                await addStore(store);
            }
        } catch (error) {
            console.error("Error loading sample data:", error);
            alert("Gagal memuat data contoh.");
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div style={{textAlign: 'center', paddingTop: '50px'}}><div className="spinner" style={{width: 40, height: 40}}></div><p style={{marginTop: '16px', color: 'var(--text-secondary)'}}>Memuat data...</p></div>;
        }
        switch (view) {
            case 'store-detail': return selectedStore ? <StoreDetailView store={selectedStore} onStoreUpdate={handleStoreUpdate} onBack={handleBackToHome} onStartOpname={handleStartOpname} opnameHistory={opnameHistory} onViewReport={handleViewReport} /> : <p>Toko tidak ditemukan.</p>;
            case 'opname': return selectedStore ? <StockOpnameView store={selectedStore} onStoreUpdate={handleStoreUpdate} onComplete={handleOpnameComplete} onCancel={handleOpnameCancel} /> : <p>Toko tidak ditemukan.</p>;
            case 'report': return activeReport ? <OpnameReportView report={activeReport} stores={stores} onClose={handleCloseReport} /> : <p>Laporan tidak ditemukan.</p>;
            default: return <HomePage stores={stores} onAddStore={handleAddStore} onUpdateStore={handleUpdateStoreInfo} onSelectStore={handleSelectStore} onDeleteStore={handleDeleteStore} isFirebaseConfigured={isFirebaseConfigured} onLoadSampleData={handleLoadSampleData} />;
        }
    };

    return (
        <div style={styles.app}>
            {!isFirebaseConfigured && (
                 <div style={{padding: '12px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text-body)', textAlign: 'center', borderBottom: '1px solid var(--warning-border)', fontWeight: 500}}>
                     <strong>Peringatan:</strong> Aplikasi berjalan dalam mode offline. Untuk mengaktifkan sinkronisasi data online, mohon&nbsp;
                     <a href="#" onClick={(e) => { e.preventDefault(); alert('Untuk mengaktifkan penyimpanan online, ikuti instruksi yang ada di dalam file src/firebaseConfig.ts pada kode proyek Anda.'); }} style={{color: 'var(--warning-text-header)', textDecoration: 'underline'}}>
                         konfigurasi Firebase
                     </a>.
                 </div>
            )}
            {isSaving && (
                 <div style={{position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-content)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div className="spinner" style={{width: '16px', height: '16px'}}></div>
                    Menyimpan...
                </div>
            )}
            <header style={{...styles.appHeader}} className="responsive-header no-print">
                <h1 style={styles.appTitle} className="app-title-style">Aplikasi Manajemen Toko</h1>
                <button onClick={toggleTheme} style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIcon}} title={`Ganti ke tema ${theme === 'light' ? 'gelap' : 'terang'}`}>
                    {theme === 'light' ? <MoonIcon size={20}/> : <SunIcon size={20}/>}
                </button>
            </header>
            <main style={styles.mainContent} className="responsive-padding">
                {renderContent()}
            </main>
        </div>
    );
};