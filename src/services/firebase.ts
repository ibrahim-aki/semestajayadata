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

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized");

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

// [1] Fungsi real-time stores
export const onStoresSnapshot = (callback: (stores: Store[]) => void) => {
  const q = query(collection(db, STORES_COLLECTION), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Store);
    callback(stores);
  }, (error) => {
    console.error("Error fetching stores:", error);
  });
};

// [2] Fungsi real-time history
export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void) => {
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as OpnameSession);
    callback(history);
  }, (error) => {
    console.error("Error fetching history:", error);
  });
};

// [3] Update store
export const updateStore = async (store: Store): Promise<void> => {
  const storeRef = doc(db, STORES_COLLECTION, store.id);
  await setDoc(storeRef, store, { merge: true });
};

// [4] Add store
export const addStore = async (store: Store): Promise<void> => {
  const storeRef = doc(db, STORES_COLLECTION, store.id);
  await setDoc(storeRef, store);
};

// [5] Delete store
export const deleteStore = async (storeId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Delete store
  batch.delete(doc(db, STORES_COLLECTION, storeId));
  
  // Delete related history
  const historyQuery = query(
    collection(db, HISTORY_COLLECTION), 
    where("storeId", "==", storeId)
  );
  
  const historySnapshot = await getDocs(historyQuery);
  historySnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

// [6] Add opname session
export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
  // Save session
  const sessionRef = doc(db, HISTORY_COLLECTION, session.id);
  await setDoc(sessionRef, session);

  // Update store
  const storeRef = doc(db, STORES_COLLECTION, session.storeId);
  const storeDoc = await getDoc(storeRef);

  if (!storeDoc.exists()) {
    throw new Error(`Store ${session.storeId} not found`);
  }

  const storeData = storeDoc.data() as Store;
  
  // Update inventory
  const newInventory = storeData.inventory.map(item => {
    const opnameItem = session.items.find(i => i.itemId === item.itemId);
    return opnameItem ? { ...item, recordedStock: opnameItem.physicalCount } : item;
  });
  
  // Update assets
  const updatedAssets = storeData.assets.map(asset => {
    const change = session.assetChanges.find(c => c.assetId === asset.id);
    return change ? { ...asset, condition: change.newCondition } : asset;
  });
  
  await updateDoc(storeRef, {
    inventory: newInventory,
    assets: updatedAssets
  });
};

// [7] Test connection
export const testFirebase = async () => {
  try {
    const testRef = doc(collection(db, 'testConnection'));
    await setDoc(testRef, { timestamp: new Date() });
    console.log("Firebase test: Write successful");
    return true;
  } catch (error) {
    console.error("Firebase test failed:", error);
    return false;
  }
};

// [8] Run test on load
testFirebase();