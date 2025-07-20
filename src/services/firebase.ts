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

import { Store, OpnameSession } from '../types/data';

let db: Firestore | null = null;

export const initFirebase = () => {
  if (db) return db; // Sudah diinisialisasi

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  const isValid = Object.values(config).every(v => typeof v === 'string' && v.trim() !== '');
  if (!isValid) {
    console.warn('[Firebase] Environment Variables belum lengkap. Mode offline.');
    return null;
  }

  const app = fbapp.initializeApp(config);
  db = getFirestore(app);
  console.log('[Firebase] Firestore berhasil dikonfigurasi.');
  return db;
};

export const getDb = () => db;

export const isFirebaseConfigured = () => db !== null;

// 🔽 Semua fungsi menggunakan getDb()
const STORES_COLLECTION = 'stores';
const HISTORY_COLLECTION = 'opnameHistory';

export const onStoresSnapshot = (callback: (stores: Store[]) => void): (() => void) => {
  const db = getDb();
  if (!db) return () => {};
  const q = query(collection(db, STORES_COLLECTION), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const stores = snap.docs.map(doc => doc.data() as Store);
    callback(stores);
  });
};

export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): (() => void) => {
  const db = getDb();
  if (!db) return () => {};
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    const history = snap.docs.map(doc => doc.data() as OpnameSession);
    callback(history);
  });
};

export const addStore = async (store: Store) => {
  const db = getDb();
  if (!db) return;
  const ref = doc(db, STORES_COLLECTION, store.id);
  await setDoc(ref, store);
};

export const updateStore = async (store: Store) => {
  const db = getDb();
  if (!db) return;
  const ref = doc(db, STORES_COLLECTION, store.id);
  await setDoc(ref, store, { merge: true });
};

export const deleteStore = async (storeId: string) => {
  const db = getDb();
  if (!db) return;
  const batch = writeBatch(db);
  const ref = doc(db, STORES_COLLECTION, storeId);
  batch.delete(ref);

  const q = query(collection(db, HISTORY_COLLECTION), where("storeId", "==", storeId));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

export const addOpnameSession = async (session: OpnameSession) => {
  const db = getDb();
  if (!db) return;

  const ref = doc(db, HISTORY_COLLECTION, session.id);
  await setDoc(ref, session);

  const storeRef = doc(db, STORES_COLLECTION, session.storeId);
  const storeSnap = await getDoc(storeRef);
  if (!storeSnap.exists()) return;

  const storeData = storeSnap.data() as Store;

  const newInventory = storeData.inventory.map(i => {
    const match = session.items.find(s => s.itemId === i.itemId);
    return match ? { ...i, recordedStock: match.physicalCount } : i;
  });

  const newAssets = storeData.assets.map(a => {
    const change = session.assetChanges.find(c => c.assetId === a.id);
    return change ? { ...a, condition: change.newCondition } : a;
  });

  await updateDoc(storeRef, {
    inventory: newInventory,
    assets: newAssets
  });
};
