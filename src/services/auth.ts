import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase'; // Impor instance dari file firebase.ts
import type { UserProfile } from '../types/data';

const USERS_COLLECTION = 'users';

/**
 * Melakukan sign-in dan mengambil profil pengguna dari Firestore.
 * @param email Email pengguna.
 * @param password Password pengguna.
 * @returns Objek yang berisi data otentikasi dan profil pengguna.
 */
export const signInAndGetUserProfile = async (email, password) => {
  if (!auth || !db) {
    throw new Error("Firebase belum diinisialisasi.");
  }

  // 1. Lakukan sign-in dengan Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Ambil data profil dari Firestore menggunakan UID pengguna
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // Kasus ini seharusnya tidak terjadi jika data dibuat dengan benar.
    // Artinya, pengguna ada di Authentication tapi tidak ada datanya di Firestore.
    await signOut(auth); // Langsung sign-out untuk keamanan
    throw new Error('Profil pengguna tidak ditemukan.');
  }

  const userProfile = userDocSnap.data() as UserProfile;

  // 3. Cek jika akun demo sudah kedaluwarsa
  if (userProfile.role === 'demo' && userProfile.trialEndsAt) {
    const now = Timestamp.now();
    if (now > userProfile.trialEndsAt) {
      await signOut(auth); // Langsung sign-out
      throw new Error('Akun demo Anda telah kedaluwarsa.');
    }
  }

  return { user, userProfile };
};

/**
 * Melakukan sign-out untuk pengguna saat ini.
 */
export const signOutUser = () => {
  if (!auth) return;
  return signOut(auth);
};
