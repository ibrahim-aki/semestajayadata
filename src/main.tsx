import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { initFirebase } from './services/firebase'; // ✅ Panggil initFirebase agar konfigurasi Firebase berjalan

// Inisialisasi Firebase sebelum render aplikasi
initFirebase();

// Titik masuk utama aplikasi
const rootElement = document.getElementById('root');

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Fatal Error: Root element with id 'root' was not found in the DOM.");
}
