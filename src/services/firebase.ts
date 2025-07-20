import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { firebaseConfig } from "../firebaseConfig";
import { Store, OpnameSession } from '../types/data';

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
console.log("Firebase berhasil diinisialisasi");

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

// Fungsi untuk mendapatkan data toko secara real-time
export const onStoresSnapshot = (callback: (stores: Store[]) => {
  // PERBAIKAN DI SINI: Hapus tanda kurung berlebih
  const q = query(collection(db, STORES_COLLECTION), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Store);
    callback(stores);
  }, (error) => {
    console.error("Gagal mendapatkan data toko:", error);
  });
};

// Fungsi untuk mendapatkan riwayat opname secara real-time
export const onHistorySnapshot = (callback: (history: OpnameSession[]) => {
  // PERBAIKAN DI SINI: Hapus tanda kurung berlebih
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as OpnameSession);
    callback(history);
  }, (error) => {
    console.error("Gagal mendapatkan riwayat opname:", error);
  });
};

// Fungsi untuk memperbarui toko
export const updateStore = async (store: Store): Promise<void> => {
  await setDoc(doc(db, STORES_COLLECTION, store.id), store, { merge: true });
};

// Fungsi untuk menambah toko baru
export const addStore = async (store: Store): Promise<void> => {
  await setDoc(doc(db, STORES_COLLECTION, store.id), store);
};

// Fungsi untuk menghapus toko dan semua riwayat terkait
export const deleteStore = async (storeId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Hapus toko
  batch.delete(doc(db, STORES_COLLECTION, storeId));
  
  // Hapus riwayat opname terkait
  const historyQuery = query(
    collection(db, HISTORY_COLLECTION), 
    where("storeId", "==", storeId)
  );
  
  const historySnapshot = await getDocs(historyQuery);
  historySnapshot.forEach(docSnapshot => {
    batch.delete(docSnapshot.ref);
  });
  
  await batch.commit();
};

// Fungsi untuk menambah sesi opname baru
export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
  // Simpan sesi opname
  await setDoc(doc(db, HISTORY_COLLECTION, session.id), session);
  
  // Update data toko menggunakan transaction
  const storeRef = doc(db, STORES_COLLECTION, session.storeId);
  
  await runTransaction(db, async (transaction) => {
    const storeDoc = await transaction.get(storeRef);
    if (!storeDoc.exists()) {
      throw new Error(`Store dengan ID ${session.storeId} tidak ditemukan`);
    }
    
    const currentStore = storeDoc.data() as Store;
    
    // Perbarui inventaris
    const newInventory = currentStore.inventory.map(item => {
      const opnameItem = session.items.find(i => i.itemId === item.itemId);
      return opnameItem ? { ...item, recordedStock: opnameItem.physicalCount } : item;
    });
    
    // Perbarui kondisi aset
    const updatedAssets = currentStore.assets.map(asset => {
      const change = session.assetChanges.find(c => c.assetId === asset.id);
      return change ? { ...asset, condition: change.newCondition } : asset;
    });
    
    // Commit perubahan
    transaction.update(storeRef, {
      inventory: newInventory,
      assets: updatedAssets
    });
  });
};