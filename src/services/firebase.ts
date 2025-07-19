import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { firebaseConfig } from "../firebaseConfig";
import { Store, OpnameSession } from '../types/data';

let db: firebase.firestore.Firestore | null = null;

// Periksa apakah nilai konfigurasi adalah placeholder atau tidak diisi
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.projectId !== 'nama-proyek-anda');

if (isConfigValid) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        console.log("Firebase berhasil dikonfigurasi dan terhubung.");
    } catch (error) {
        console.error("Gagal menginisialisasi Firebase. Periksa Environment Variables di Vercel dan redeploy.", error);
        alert(`Koneksi ke database gagal. Pastikan Environment Variables di Vercel sudah benar dan Anda telah melakukan 'Redeploy'.\n\nError: ${(error as Error).message}`);
        db = null;
    }
} else {
    console.warn("Konfigurasi Firebase belum diatur. Silakan atur Environment Variables di Vercel. Aplikasi akan berjalan dalam mode offline.");
}

export const isFirebaseConfigured = isConfigValid && db !== null;

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

// Fungsi untuk mendapatkan data toko secara real-time
export const onStoresSnapshot = (callback: (stores: Store[]) => void): (() => void) => {
    if (!db) return () => {};
    const q: firebase.firestore.Query = db.collection(STORES_COLLECTION).orderBy("name");
    return q.onSnapshot((snapshot) => {
        const stores = snapshot.docs.map(doc => doc.data() as Store);
        callback(stores);
    }, (error) => {
        console.error("Gagal mendapatkan data toko: ", error);
        alert(`Gagal mengambil data dari database. Error: ${error.message}`);
    });
};

// Fungsi untuk mendapatkan riwayat opname secara real-time
export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): (() => void) => {
    if (!db) return () => {};
    const q: firebase.firestore.Query = db.collection(HISTORY_COLLECTION).orderBy("date", "desc");
    return q.onSnapshot((snapshot) => {
        const history = snapshot.docs.map(doc => doc.data() as OpnameSession);
        callback(history);
    }, (error) => {
        console.error("Gagal mendapatkan riwayat opname: ", error);
    });
};

// Fungsi untuk memperbarui seluruh dokumen toko
export const updateStore = async (store: Store): Promise<void> => {
    if (!db) return;
    await db.collection(STORES_COLLECTION).doc(store.id).set(store);
};

// Fungsi untuk menambah toko baru
export const addStore = async (store: Store): Promise<void> => {
    if (!db) return;
    await db.collection(STORES_COLLECTION).doc(store.id).set(store);
};

// Fungsi untuk menghapus toko dan semua riwayat opname terkait
export const deleteStore = async (storeId: string): Promise<void> => {
    if (!db) return;
    const batch = db.batch();

    const storeDocRef = db.collection(STORES_COLLECTION).doc(storeId);
    batch.delete(storeDocRef);

    const historyQuery = db.collection(HISTORY_COLLECTION).where("storeId", "==", storeId);
    const historySnapshot = await historyQuery.get();
    historySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// Fungsi untuk menambah sesi opname baru
export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
    if (!db) return;
    
    // Simpan sesi opname
    await db.collection(HISTORY_COLLECTION).doc(session.id).set(session);

    // Ambil data toko saat ini untuk pembaruan yang aman
    const storeDocRef = db.collection(STORES_COLLECTION).doc(session.storeId);
    const storeDoc = await storeDocRef.get();
    if (!storeDoc.exists) {
        console.error("Store not found for opname update.");
        return;
    }

    const currentStoreData = storeDoc.data() as Store;

    // Perbarui inventaris berdasarkan opname
    const newInventory = currentStoreData.inventory.map(inv => {
        const opnameItem = session.items.find(i => i.itemId === inv.itemId);
        return opnameItem ? { ...inv, recordedStock: opnameItem.physicalCount } : inv;
    });

    // Perbarui kondisi aset berdasarkan opname
    const updatedAssets = currentStoreData.assets.map(asset => {
        const change = session.assetChanges.find(c => c.assetId === asset.id);
        return change ? { ...asset, condition: change.newCondition } : asset;
    });

    // Lakukan pembaruan pada dokumen toko
    await storeDocRef.update({
        inventory: newInventory,
        assets: updatedAssets
    });
};