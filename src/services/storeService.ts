import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Store, OpnameSession } from '../types/data';

// Kita akan menyimpan semua data toko dan riwayat dalam satu dokumen per pengguna
// untuk menyederhanakan arsitektur.
const USER_DATA_COLLECTION = 'userData';

type UserData = {
  stores: Store[];
  opnameHistory: OpnameSession[];
  updatedAt: Timestamp;
};

/**
 * Membuat listener real-time untuk data (toko & riwayat) milik pengguna.
 * @param userId UID pengguna.
 * @param callback Fungsi yang akan dipanggil setiap kali ada pembaruan data.
 * @returns Fungsi untuk berhenti mendengarkan (unsubscribe).
 */
export const onUserDataSnapshot = (userId: string, callback: (data: { stores: Store[], opnameHistory: OpnameSession[] }) => void) => {
  if (!db) {
    console.error("Firestore belum diinisialisasi.");
    return () => {}; // Kembalikan fungsi kosong jika db tidak ada
  }

  const userDocRef = doc(db, USER_DATA_COLLECTION, userId);

  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;
      callback({ stores: data.stores || [], opnameHistory: data.opnameHistory || [] });
    } else {
      // Jika dokumen belum ada, panggil callback dengan data kosong.
      callback({ stores: [], opnameHistory: [] });
    }
  }, (error) => {
    console.error("Gagal mendapatkan data pengguna:", error);
  });
};

/**
 * Menyimpan data toko dan riwayat pengguna ke Firestore.
 * @param userId UID pengguna.
 * @param stores Array data toko yang akan disimpan.
 * @param opnameHistory Array data riwayat yang akan disimpan.
 */
export const saveUserData = async (userId: string, stores: Store[], opnameHistory: OpnameSession[]) => {
  if (!db) {
    console.error("Firestore belum diinisialisasi.");
    return;
  }

  const userDocRef = doc(db, USER_DATA_COLLECTION, userId);
  const dataToSave: UserData = {
    stores,
    opnameHistory,
    updatedAt: Timestamp.now(),
  };

  // setDoc akan membuat dokumen baru jika belum ada, atau menimpa yang sudah ada.
  await setDoc(userDocRef, dataToSave);
};
