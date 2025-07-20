import * as fbapp from 'firebase/app'
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
} from 'firebase/firestore'

import { firebaseConfig } from "../firebaseConfig"
import { Store, OpnameSession } from '../types/data'

// 🧪 Log config untuk debugging di Console browser (hapus setelah deploy stabil)
console.log("🔥 Firebase Config Loaded:", firebaseConfig)

let app: fbapp.FirebaseApp | null = null
let db: Firestore | null = null

// ✅ Validasi semua key firebaseConfig tidak null/undefined
const isConfigValid = Object.values(firebaseConfig).every(Boolean)

if (isConfigValid) {
  try {
    app = fbapp.initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log("✅ Firebase berhasil dikonfigurasi dan terhubung.")
  } catch (error) {
    console.error("❌ Gagal inisialisasi Firebase:", error)
    alert(`Koneksi ke database gagal. Pastikan Environment Variables sudah benar.\n\nError: ${(error as Error).message}`)
    db = null
  }
} else {
  console.warn("⚠️ Firebase config tidak valid. Mode offline aktif.", firebaseConfig)
  alert("Peringatan: Aplikasi berjalan dalam mode offline. Silakan periksa konfigurasi Firebase.")
}

export const isFirebaseConfigured = isConfigValid && db !== null

const STORES_COLLECTION = 'stores'
const HISTORY_COLLECTION = 'opnameHistory'

export const onStoresSnapshot = (callback: (stores: Store[]) => void): (() => void) => {
  if (!db) return () => {}
  const q = query(collection(db, STORES_COLLECTION), orderBy("name"))
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => doc.data() as Store)
    callback(stores)
  }, (error) => {
    console.error("❌ Gagal mengambil data toko:", error)
    alert(`Gagal mengambil data dari database. Error: ${error.message}`)
  })
}

export const onHistorySnapshot = (callback: (history: OpnameSession[]) => void): (() => void) => {
  if (!db) return () => {}
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("date", "desc"))
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => doc.data() as OpnameSession)
    callback(history)
  }, (error) => {
    console.error("❌ Gagal mendapatkan riwayat opname:", error)
  })
}

export const updateStore = async (store: Store): Promise<void> => {
  if (!db) return
  const storeRef = doc(db, STORES_COLLECTION, store.id)
  await setDoc(storeRef, store, { merge: true })
}

export const addStore = async (store: Store): Promise<void> => {
  if (!db) return
  const storeRef = doc(db, STORES_COLLECTION, store.id)
  await setDoc(storeRef, store)
}

export const deleteStore = async (storeId: string): Promise<void> => {
  if (!db) return
  const batch = writeBatch(db)
  const storeDocRef = doc(db, STORES_COLLECTION, storeId)
  batch.delete(storeDocRef)

  const historyQuery = query(collection(db, HISTORY_COLLECTION), where("storeId", "==", storeId))
  const historySnapshot = await getDocs(historyQuery)
  historySnapshot.forEach(doc => {
    batch.delete(doc.ref)
  })

  await batch.commit()
}

export const addOpnameSession = async (session: OpnameSession): Promise<void> => {
  if (!db) return

  const sessionRef = doc(db, HISTORY_COLLECTION, session.id)
  await setDoc(sessionRef, session)

  const storeDocRef = doc(db, STORES_COLLECTION, session.storeId)
  const storeDoc = await getDoc(storeDocRef)

  if (!storeDoc.exists()) {
    console.error("❌ Store tidak ditemukan untuk update opname.")
    return
  }

  const currentStoreData = storeDoc.data() as Store
  const newInventory = currentStoreData.inventory.map(inv => {
    const opnameItem = session.items.find(i => i.itemId === inv.itemId)
    return opnameItem ? { ...inv, recordedStock: opnameItem.physicalCount } : inv
  })

  const updatedAssets = currentStoreData.assets.map(asset => {
    const change = session.assetChanges.find(c => c.assetId === asset.id)
    return change ? { ...asset, condition: change.newCondition } : asset
  })

  await updateDoc(storeDocRef, {
    inventory: newInventory,
    assets: updatedAssets
  })
}
