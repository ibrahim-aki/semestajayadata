

import { useState, useEffect, useMemo } from 'react';
import { Store, OpnameSession } from './types/data';
import { styles } from './styles';
import { HomePage } from './components/views/HomePage';
import { StoreDetailView } from './components/views/StoreDetailView';
import { StockOpnameView } from './components/views/StockOpnameView';
import { OpnameReportView } from './components/views/OpnameReportView';
import { defaultStores } from './data/defaultData';
import { SunIcon, MoonIcon } from './components/common/Icons';

const APP_STORAGE_KEY_STORES = 'manajemen-toko-app-stores';
const APP_STORAGE_KEY_HISTORY = 'manajemen-toko-app-history';
const APP_STORAGE_KEY_THEME = 'manajemen-toko-app-theme';


export const App = () => {
    const [stores, setStores] = useState<Store[]>(() => {
        try {
            const saved = localStorage.getItem(APP_STORAGE_KEY_STORES);
            if (saved) {
                const parsedStores = JSON.parse(saved);
                if (Array.isArray(parsedStores) && parsedStores.length > 0) {
                    // Ensure all stores have the new fields for backward compatibility
                    return parsedStores.map(store => ({
                        ...{ // Default values for potentially missing fields
                            investors: [],
                            cashFlow: [],
                            capitalRecouped: 0,
                            netProfit: 0,
                        },
                        ...store, // Saved values will override defaults
                    }));
                }
            }
            return defaultStores; // Load default if nothing usable in localStorage
        } catch (e) {
            console.error("Failed to load stores, initializing with default data.", e);
            return defaultStores;
        }
    });
    const [opnameHistory, setOpnameHistory] = useState<OpnameSession[]>(() => { try { const saved = localStorage.getItem(APP_STORAGE_KEY_HISTORY); return saved ? JSON.parse(saved) : []; } catch (e) { console.error(e); return []; } });
    const [view, setView] = useState<'home' | 'store-detail' | 'opname' | 'report'>('home');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [activeReport, setActiveReport] = useState<OpnameSession | null>(null);
    const [theme, setTheme] = useState(() => localStorage.getItem(APP_STORAGE_KEY_THEME) || 'light');
    
    useEffect(() => { try { localStorage.setItem(APP_STORAGE_KEY_STORES, JSON.stringify(stores)); } catch (e) { console.error(e); } }, [stores]);
    useEffect(() => { try { localStorage.setItem(APP_STORAGE_KEY_HISTORY, JSON.stringify(opnameHistory)); } catch (e) { console.error(e); } }, [opnameHistory]);
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(APP_STORAGE_KEY_THEME, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);

    const handleSelectStore = (storeId: string) => { setSelectedStoreId(storeId); setView('store-detail'); };
    const handleBackToHome = () => { setSelectedStoreId(null); setView('home'); setActiveReport(null); };
    const handleStartOpname = () => { if (selectedStore) setView('opname'); };
    
    const handleOpnameComplete = (report: OpnameSession) => {
        setOpnameHistory(prev => [report, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setActiveReport(report);
        setView('report');
    };
    
    const handleStoreUpdate = (updatedStore: Store) => { setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s)); };
    const handleAddStore = (newStore: Store) => { setStores(prev => [...prev, newStore]); };
    const handleUpdateStoreInfo = (storeId: string, data: { name: string, address: string }) => {
        setStores(prev => prev.map(s => s.id === storeId ? { ...s, ...data } : s));
    };
    const handleOpnameCancel = () => setView('store-detail');
    const handleCloseReport = () => { setActiveReport(null); setView('store-detail'); };
    const handleDeleteStore = (storeIdToDelete: string) => {
        setStores(currentStores => currentStores.filter(store => store.id !== storeIdToDelete));
        setOpnameHistory(currentHistory => currentHistory.filter(session => session.storeId !== storeIdToDelete));
        if (selectedStoreId === storeIdToDelete) handleBackToHome();
    };
    const handleViewReport = (report: OpnameSession) => {
        setActiveReport(report);
        setView('report');
    };

    const renderContent = () => {
        switch (view) {
            case 'store-detail': return selectedStore ? <StoreDetailView store={selectedStore} onStoreUpdate={handleStoreUpdate} onBack={handleBackToHome} onStartOpname={handleStartOpname} opnameHistory={opnameHistory} onViewReport={handleViewReport} /> : <p>Toko tidak ditemukan.</p>;
            case 'opname': return selectedStore ? <StockOpnameView store={selectedStore} onStoreUpdate={handleStoreUpdate} onComplete={handleOpnameComplete} onCancel={handleOpnameCancel} /> : <p>Toko tidak ditemukan.</p>;
            case 'report': return activeReport ? <OpnameReportView report={activeReport} stores={stores} onClose={handleCloseReport} /> : <p>Laporan tidak ditemukan.</p>;
            default: return <HomePage stores={stores} onAddStore={handleAddStore} onUpdateStore={handleUpdateStoreInfo} onSelectStore={handleSelectStore} onDeleteStore={handleDeleteStore} />;
        }
    };

    return (
        <div style={styles.app}>
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