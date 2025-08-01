import { useState, useEffect, useMemo, useCallback } from 'react';
import { Store, OpnameSession, UserProfile } from './types/data';
import { styles } from './styles';
import { HomePage } from './components/views/HomePage';
import { StoreDetailView } from './components/views/StoreDetailView';
import { StockOpnameView } from './components/views/StockOpnameView';
import { OpnameReportView } from './components/views/OpnameReportView';
import { LoginView } from './components/views/LoginView';
import { defaultStores } from './data/defaultData';
import { SunIcon, MoonIcon, LogOutIcon, ClockIcon } from './components/common/Icons';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const APP_STORAGE_KEY_THEME = 'manajemen-toko-app-theme';

// FIX: Komponen ini diubah untuk memperbaiki error tipe data TypeScript.
// Fungsionalitasnya tetap sama.
const DemoExpirationBanner = ({ expirationTimestamp }: { expirationTimestamp: number }) => {
    // Fungsi ini sekarang dibungkus dengan useCallback dan DIJAMIN selalu mengembalikan string.
    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const difference = expirationTimestamp - now;

        if (difference <= 0) {
            return 'Sesi demo telah berakhir.';
        }
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        return `${days} hari, ${hours} jam, ${minutes} menit`;
    }, [expirationTimestamp]);

    // State diinisialisasi langsung dengan hasil fungsi.
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        // useEffect sekarang hanya bertugas untuk menjalankan interval.
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // Update setiap 1 menit.
        
        return () => clearInterval(interval);
    }, [calculateTimeLeft]);

    return (
        <div style={styles.expirationBanner}>
            <ClockIcon color="var(--warning-icon)" size={20} />
            Sesi demo Anda akan berakhir dalam: <strong>{timeLeft}</strong>
        </div>
    );
};


export const App = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [opnameHistory, setOpnameHistory] = useState<OpnameSession[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    const [view, setView] = useState<'home' | 'store-detail' | 'opname' | 'report'>('home');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [activeReport, setActiveReport] = useState<OpnameSession | null>(null);
    const [theme, setTheme] = useState(() => localStorage.getItem(APP_STORAGE_KEY_THEME) || 'light');

    const handleLogout = useCallback(() => {
        signOut(auth).catch(error => console.error("Logout error", error));
        setUser(null);
        setView('home');
        setSelectedStoreId(null);
        setActiveReport(null);
        setStores([]);
        setOpnameHistory([]);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    
                    if (userData.role === 'demo' && userData.trialEndsAt) {
                        const expirationMillis = userData.trialEndsAt.toMillis();
                        if (Date.now() > expirationMillis) {
                            alert('Sesi demo Anda telah berakhir.');
                            handleLogout();
                            return;
                        }
                    }
                    
                    setUser(userData);

                } else {
                    console.error("Dokumen pengguna tidak ditemukan untuk UID:", firebaseUser.uid);
                    handleLogout();
                }
            } else {
                setUser(null);
            }
            setAuthChecked(true);
        });
        return () => unsubscribe();
    }, [handleLogout]);

    useEffect(() => {
        if (user) {
            setIsLoadingData(true);
            const storesKey = `manajemen-toko-app-stores-${user.uid}`;
            const historyKey = `manajemen-toko-app-history-${user.uid}`;
            
            try {
                const savedStores = localStorage.getItem(storesKey);
                const parsedStores = savedStores ? JSON.parse(savedStores) : defaultStores;
                setStores(parsedStores.map((store: any) => ({
                    ...{ investors: [], cashFlow: [], capitalRecouped: 0, netProfit: 0 },
                    ...store,
                })));

                const savedHistory = localStorage.getItem(historyKey);
                setOpnameHistory(savedHistory ? JSON.parse(savedHistory) : []);
            } catch (e) {
                console.error("Gagal memuat data, kembali ke default.", e);
                setStores(defaultStores);
                setOpnameHistory([]);
            } finally {
                setIsLoadingData(false);
            }
        } else {
            setIsLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && !isLoadingData) {
            try {
                const storesKey = `manajemen-toko-app-stores-${user.uid}`;
                const historyKey = `manajemen-toko-app-history-${user.uid}`;
                localStorage.setItem(storesKey, JSON.stringify(stores));
                localStorage.setItem(historyKey, JSON.stringify(opnameHistory));
            } catch (e) {
                console.error("Gagal menyimpan data ke localStorage", e);
            }
        }
    }, [stores, opnameHistory, user, isLoadingData]);
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(APP_STORAGE_KEY_THEME, theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);

    const handleSelectStore = (storeId: string) => { setSelectedStoreId(storeId); setView('store-detail'); };
    const handleBackToHome = () => { setSelectedStoreId(null); setView('home'); setActiveReport(null); };
    const handleStartOpname = () => { if (selectedStore) setView('opname'); };
    
    const handleOpnameComplete = (report: OpnameSession) => {
        setOpnameHistory(prev => [report, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setActiveReport(report);
        setView('report');
    };
    
    const handleStoreUpdate = (updatedStore: Store) => setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    const handleAddStore = (newStore: Store) => setStores(prev => [...prev, newStore]);
    const handleUpdateStoreInfo = (storeId: string, data: { name: string, address: string }) => setStores(prev => prev.map(s => s.id === storeId ? { ...s, ...data } : s));
    const handleOpnameCancel = () => setView('store-detail');
    const handleCloseReport = () => { setActiveReport(null); setView('store-detail'); };
    const handleDeleteStore = (storeIdToDelete: string) => {
        setStores(currentStores => currentStores.filter(store => store.id !== storeIdToDelete));
        setOpnameHistory(currentHistory => currentHistory.filter(session => session.storeId !== storeIdToDelete));
        if (selectedStoreId === storeIdToDelete) handleBackToHome();
    };
    const handleViewReport = (report: OpnameSession) => { setActiveReport(report); setView('report'); };

    const renderContent = () => {
        if (isLoadingData) {
            return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}><div className="spinner" style={{width: 40, height: 40}}></div></div>;
        }
        switch (view) {
            case 'store-detail': return selectedStore ? <StoreDetailView store={selectedStore} onStoreUpdate={handleStoreUpdate} onBack={handleBackToHome} onStartOpname={handleStartOpname} opnameHistory={opnameHistory} onViewReport={handleViewReport} /> : <p>Toko tidak ditemukan.</p>;
            case 'opname': return selectedStore ? <StockOpnameView store={selectedStore} onStoreUpdate={handleStoreUpdate} onComplete={handleOpnameComplete} onCancel={handleOpnameCancel} /> : <p>Toko tidak ditemukan.</p>;
            case 'report': return activeReport ? <OpnameReportView report={activeReport} stores={stores} onClose={handleCloseReport} /> : <p>Laporan tidak ditemukan.</p>;
            default: return <HomePage stores={stores} onAddStore={handleAddStore} onUpdateStore={handleUpdateStoreInfo} onSelectStore={handleSelectStore} onDeleteStore={handleDeleteStore} />;
        }
    };

    if (!authChecked) {
        return <div style={{...styles.app, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><div className="spinner" style={{width: 50, height: 50}}></div></div>;
    }

    if (!user) {
        return <LoginView />;
    }

    return (
        <div style={styles.app}>
            <header style={{...styles.appHeader}} className="responsive-header no-print">
                <h1 style={styles.appTitle} className="app-title-style">Aplikasi Manajemen Toko</h1>
                <div style={styles.inlineFlex}>
                    <button onClick={toggleTheme} style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIcon}} title={`Ganti ke tema ${theme === 'light' ? 'gelap' : 'terang'}`}>
                        {theme === 'light' ? <MoonIcon size={20}/> : <SunIcon size={20}/>}
                    </button>
                    <button onClick={handleLogout} style={{...styles.button, ...styles.buttonOutline, ...styles.buttonIcon}} title="Logout">
                        <LogOutIcon size={20}/>
                    </button>
                </div>
            </header>
            <main style={styles.mainContent} className="responsive-padding">
                {user.role === 'demo' && user.trialEndsAt && <DemoExpirationBanner expirationTimestamp={user.trialEndsAt.toMillis()} />}
                {renderContent()}
            </main>
        </div>
    );
};
