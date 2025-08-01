import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Gunakan import.meta.env untuk mengakses environment variables di Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Variabel untuk menampung instance Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Cek apakah semua variabel konfigurasi ada sebelum inisialisasi
const isFirebaseConfigValid = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim() !== ''
);

if (isFirebaseConfigValid) {
  // Inisialisasi Firebase
  app = initializeApp(firebaseConfig);
  
  // Inisialisasi service Auth dan Firestore
  auth = getAuth(app);
  db = getFirestore(app);

  console.log("[Firebase] Berhasil dikonfigurasi dan terhubung.");
} else {
  console.error("[Firebase] Konfigurasi Firebase tidak lengkap. Pastikan file .env.local sudah benar dan server sudah di-restart.");
  // Handle kasus di mana Firebase tidak bisa diinisialisasi
  // Anda bisa melempar error atau menggunakan instance "dummy" jika diperlukan
  // Untuk sekarang, kita akan biarkan instance tidak terdefinisi,
  // yang akan menyebabkan error jika coba digunakan.
}

// Ekspor instance yang sudah diinisialisasi
// @ts-ignore - Ini untuk memberitahu TypeScript agar mengabaikan kemungkinan 'uninitialized'
// karena kita sudah menanganinya dengan pesan error di atas.
export { app, auth, db, isFirebaseConfigValid };
