import { initializeApp, FirebaseApp } from "firebase/app";
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    writeBatch,
    getDocs,
    Firestore,
    Unsubscribe,
    Query
} from "firebase/firestore";
import { firebaseConfig } from "../firebaseConfig";
import { Store, OpnameSession } from '../types/data';

let app: FirebaseApp;
let db: Firestore | null = null;

// Periksa apakah nilai konfigurasi adalah placeholder
const isConfigValid = firebaseConfig.apiKey !== "GANTI_DENGAN_API_KEY_ANDA" && firebaseConfig.projectId !== "GANTI_DENGAN_PROJECT_ID_ANDA";

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase berhasil dikonfigurasi dan terhubung.");
    } catch (error) {
        console.error("Gagal menginisialisasi Firebase, periksa konfigurasi Anda:", error);
        db = null;
    }
} else {
    console.warn("Konfigurasi Firebase belum diatur. Silakan edit src/firebaseConfig.ts. Aplikasi akan berjalan dalam mode offline.");
}

export const isFirebaseConfigured = isConfigValid && db !== null;

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

// Fungsi untuk mendapatkan data toko secara real-time
export const onStoresSnapshot = (callback: (stores: Store[]) => void): Unsubscribe => {
    if (!db) return () => {};
    const q: Query = query(collection(db, STORES_COLLECTION), orderBy("name"));
    return onSnapshot(q, (snapshot) => {
        const stores = snapshot.docs.map(doc => doc.data() as Store);
        callback(stores);
    }, (error) => {
        console.error("Gagal mendapatkan data toko: ", error);
    });
};

// Fungsi untuk mendapatkan riwayat opname secara real-time
export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): Unsubscribe => {
    if (!db) return () => {};
    const q: Query = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => doc.data() as OpnameSession);
        callback(history);
    }, (error) => {
        console.error("Gagal mendapatkan riwayat opname: ", error);
    });
};

// Fungsi untuk memperbarui seluruh dokumen toko
export const updateStore = async (store: Store): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, STORES_COLLECTION, store.id), store);
};

// Fungsi untuk menambah toko baru
export const addStore = async (store: Store): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, STORES_COLLECTION, store.id), store);
};

// Fungsi untuk menghapus toko dan semua riwayat opname terkait
export const deleteStore = async (storeId: string): Promise<void> => {
    if (!db) return;
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

// Fungsi untuk menambah sesi opname baru
export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, HISTORY_COLLECTION, session.id), session);
    // Juga perbarui data di dalam dokumen toko terkait (inventory dan aset)
    const storeDocRef = doc(db, STORES_COLLECTION, session.storeId);
    const newInventory = session.items.map(item => ({
      itemId: item.itemId,
      recordedStock: item.physicalCount,
    }));
    
    // Asumsi kita perlu mengambil data aset saat ini untuk diperbarui
    const storeSnapshot = await getDocs(query(collection(db, STORES_COLLECTION), where("id", "==", session.storeId)));
    if (!storeSnapshot.empty) {
        const storeData = storeSnapshot.docs[0].data() as Store;
        const updatedAssets = storeData.assets.map(asset => {
            const change = session.assetChanges.find(c => c.assetId === asset.id);
            return change ? { ...asset, condition: change.newCondition } : asset;
        });
        await setDoc(storeDocRef, { inventory: newInventory, assets: updatedAssets }, { merge: true });
    }
};
