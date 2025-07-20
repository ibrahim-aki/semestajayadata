// src/firebaseConfig.ts

// File ini membaca konfigurasi Firebase dari Environment Variables.
// Jangan menaruh API key secara hardcoded di sini. 
// Pastikan variabel sudah disetel di Vercel Dashboard.

function validateEnv(key: string, name: string): string {
  const value = import.meta.env[key];
  if (!value || value.includes('xxx') || value === 'your-' || value === 'undefined') {
    console.warn(`[firebaseConfig] ${name} belum dikonfigurasi dengan benar.`);
  }
  return value;
}

export const firebaseConfig = {
  apiKey: validateEnv('VITE_FIREBASE_API_KEY', 'API Key'),
  authDomain: validateEnv('VITE_FIREBASE_AUTH_DOMAIN', 'Auth Domain'),
  projectId: validateEnv('VITE_FIREBASE_PROJECT_ID', 'Project ID'),
  storageBucket: validateEnv('VITE_FIREBASE_STORAGE_BUCKET', 'Storage Bucket'),
  messagingSenderId: validateEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'Messaging Sender ID'),
  appId: validateEnv('VITE_FIREBASE_APP_ID', 'App ID')
};
