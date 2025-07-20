import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy, 
  where, 
  getDocs,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { firebaseConfig } from "../firebaseConfig";
import { Store, OpnameSession } from '../types/data';

// Inisialisasi Firebase langsung
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized with manual config");

// Test koneksi Firebase
const testConnection = async () => {
  try {
    const testRef = doc(collection(db, 'testConnection'));
    await setDoc(testRef, { 
      timestamp: new Date(),
      message: "Firebase test successful" 
    });
    console.log("Firebase test: Write successful");
  } catch (error) {
    console.error("Firebase test failed:", error);
  }
};

testConnection();

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

export const onStoresSnapshot = (callback: (stores: Store[]) => {
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

export const onHistorySnapshot = (callback: (history: OpnameSession[]) => {
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

export const updateStore = async (store: Store): Promise<void> => {
  try {
    const storeRef = doc(db, STORES_COLLECTION, store.id);
    await setDoc(storeRef, store, { merge: true });
  } catch (error) {
    console.error("Gagal memperbarui toko:", error);
  }
};

export const addStore = async (store: Store): Promise<void> => {
  try {
    const storeRef = doc(db, STORES_COLLECTION, store.id);
    await setDoc(storeRef, store);
  } catch (error) {
    console.error("Gagal menambah toko:", error);
  }
};

export const deleteStore = async (storeId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const storeDocRef = doc(db, STORES_COLLECTION, storeId);
    batch.delete(storeDocRef);
    
    const historyQuery = query(
      collection(db, HISTORY_COLLECTION), 
      where("storeId", "==", storeId)
    );
    
    const historySnapshot = await getDocs(historyQuery);
    historySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Gagal menghapus toko:", error);
  }
};

export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
  try {
    const sessionRef = doc(db, HISTORY_COLLECTION, session.id);
    await setDoc(sessionRef, session);

    const storeDocRef = doc(db, STORES_COLLECTION, session.storeId);
    const storeDoc = await getDoc(storeDocRef);

    if (!storeDoc.exists()) {
      console.error("Toko tidak ditemukan untuk update opname");
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
    
  } catch (error) {
    console.error("Gagal menambah sesi opname:", error);
  }
};