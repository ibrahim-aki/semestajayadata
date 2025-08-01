import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile } from '../types/data';

const USERS_COLLECTION = 'users';

// FIX: Menambahkan tipe 'string' pada parameter
export const signInAndGetUserProfile = async (email: string, password: string) => {
  if (!auth || !db) {
    throw new Error("Firebase belum diinisialisasi.");
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    await signOut(auth);
    throw new Error('Profil pengguna tidak ditemukan.');
  }

  const userProfile = userDocSnap.data() as UserProfile;

  if (userProfile.role === 'demo' && userProfile.trialEndsAt) {
    const now = Timestamp.now();
    if (now > userProfile.trialEndsAt) {
      await signOut(auth);
      throw new Error('Akun demo Anda telah kedaluwarsa.');
    }
  }

  return { user, userProfile };
};

export const signOutUser = () => {
  if (!auth) return;
  return signOut(auth);
};
