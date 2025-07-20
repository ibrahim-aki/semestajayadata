import * as fbapp from 'firebase/app';
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
  getDoc,
  Firestore
} from 'firebase/firestore';

import { firebaseConfig } from '../firebaseConfig';
import { Store, OpnameSession } from '../types/data';

let app: fbapp.FirebaseApp | null = null;
let db: Firestore | null = null;

// ✅ Cek apakah seluruh variabel konfigurasi Firebase sudah tersedia
const isFirebaseEnvValid = Object.values(firebaseConfig).every(value =>
  typeof value === 'string' && value.trim() !== ''
);

if (isFirebaseEnvValid) {
  try {
    app = fbapp.initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[Firebase] Firebase berhasil dikonfigurasi & tersambung.');
  } catch (error) {
    console.error('[Firebase] Gagal inisialisasi:', error);
    db = null;
  }
} else {
  console.warn('[Firebase] Environment Variables belum lengkap. Mode offline.');
}

export const isFirebaseConfigured = isFirebaseEnvValid && db !== null;

const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

// Realtime listener data toko
export const onStoresSnapshot = (callback: (stores: Store[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, STORES_COLLECTION), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => doc.data() as Store);
    callback(stores);
  }, (error) => {
    console.error('[Firebase] Gagal mendapatkan data toko:', error);
  });
};

// Realtime listener data riwayat
export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, HISTORY_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => doc.data() as OpnameSession);
    callback(history);
  }, (error) => {
    console.error('[Firebase] Gagal mendapatkan data riwayat:', error);
  });
};

export const addStore = async (store: Store) => {
  if (!db) return;
  const ref = doc(db, STORES_COLLECTION, store.id);
  await setDoc(ref, store);
};

export const updateStore = async (store: Store) => {
  if (!db) return;
  const ref = doc(db, STORES_COLLECTION, store.id);
  await setDoc(ref, store, { merge: true });
};

export const deleteStore = async (storeId: string) => {
  if (!db) return;
  const batch = writeBatch(db);
  const storeRef = doc(db, STORES_COLLECTION, storeId);
  batch.delete(storeRef);

  const historyQuery = query(collection(db, HISTORY_COLLECTION), where('storeId', '==', storeId));
  const historySnapshot = await getDocs(historyQuery);
  historySnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
};

export const addOpnameSession = async (session: OpnameSession) => {
  if (!db) return;

  const sessionRef = doc(db, HISTORY_COLLECTION, session.id);
  await setDoc(sessionRef, session);

  const storeRef = doc(db, STORES_COLLECTION, session.storeId);
  const storeSnap = await getDoc(storeRef);

  if (!storeSnap.exists()) {
    console.warn('[Firebase] Store tidak ditemukan saat update opname.');
    return;
  }

  const storeData = storeSnap.data() as Store;

  const updatedInventory = storeData.inventory.map(inv => {
    const opnameItem = session.items.find(i => i.itemId === inv.itemId);
    return opnameItem ? { ...inv, recordedStock: opnameItem.physicalCount } : inv;
  });

  const updatedAssets = storeData.assets.map(asset => {
    const change = session.assetChanges.find(c => c.assetId === asset.id);
    return change ? { ...asset, condition: change.newCondition } : asset;
  });

  await updateDoc(storeRef, {
    inventory: updatedInventory,
    assets: updatedAssets
  });
};
