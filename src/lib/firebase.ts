import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    writeBatch, 
    query, 
    orderBy, 
    where, 
    getDocs,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { Store, OpnameSession } from '../types/data';

// Konfigurasi Firebase langsung di file ini
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const isFirebaseConfigured = !!firebaseConfig.apiKey;

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

export const onStoresSnapshot = (callback: (stores: Store[]) => void): (() => void) => {
    if (!isFirebaseConfigured) return () => {};
    const q = query(collection(db, STORES_COLLECTION), orderBy("name"));
    return onSnapshot(q, (snapshot) => {
        const stores = snapshot.docs.map(doc => doc.data() as Store);
        callback(stores);
    }, (error) => {
        console.error("Gagal mendapatkan data toko: ", error);
    });
};

export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): (() => void) => {
    if (!isFirebaseConfigured) return () => {};
    const q = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => doc.data() as OpnameSession);
        callback(history);
    }, (error) => {
        console.error("Gagal mendapatkan riwayat opname: ", error);
    });
};

export const updateStore = async (store: Store): Promise<void> => {
    if (!isFirebaseConfigured) return;
    const storeRef = doc(db, STORES_COLLECTION, store.id);
    await setDoc(storeRef, store, { merge: true });
};

export const addStore = async (store: Store): Promise<void> => {
    if (!isFirebaseConfigured) return;
    const storeRef = doc(db, STORES_COLLECTION, store.id);
    await setDoc(storeRef, store);
};

export const deleteStore = async (storeId: string): Promise<void> => {
    if (!isFirebaseConfigured) return;
    const batch = writeBatch(db);
    const storeDocRef = doc(db, STORES_COLLECTION, storeId);
    batch.delete(storeDocRef);
    const historyQuery = query(collection(db, HISTORY_COLLECTION), where("storeId", "==", storeId));
    const historySnapshot = await getDocs(historyQuery);
    historySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
    if (!isFirebaseConfigured) return;
    
    const sessionRef = doc(db, HISTORY_COLLECTION, session.id);
    await setDoc(sessionRef, session);

    const storeDocRef = doc(db, STORES_COLLECTION, session.storeId);
    const storeDoc = await getDoc(storeDocRef);

    if (!storeDoc.exists()) {
        console.error("Store not found for opname update.");
        return;
    }

    const currentStoreData = storeDoc.data() as Store;
    const newInventory = currentStoreData.inventory.map(inv => {
        const opnameItem = session.items.find(i => i.itemId === inv.itemId);
        return opnameItem ? { ...inv, recordedStock: opnameItem.physicalCount } : inv;
    });

    const updatedAssets = currentStoreData.assets.map(asset => {
        const change = session.assetChanges.find(c => c.assetId === asset.id);
        return change ? { ...asset, condition: change.newCondition } : asset;
    });

    await updateDoc(storeDocRef, {
        inventory: newInventory,
        assets: updatedAssets
    });
};