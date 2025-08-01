import React, { useState, useRef, useEffect } from 'react';
import { styles } from '../../styles';
import { LockIcon } from '../common/Icons';
// Impor fungsi baru dari auth.ts
import { signInAndGetUserProfile } from '../../services/auth';

export const LoginView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        emailInputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Email dan password harus diisi.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // Panggil fungsi login yang baru
            const { user, userProfile } = await signInAndGetUserProfile(email, password);
            
            // Jika berhasil, onAuthStateChanged di App.tsx akan menangani navigasi.
            // Anda juga bisa menyimpan userProfile ke global state (seperti Context atau Redux) di sini.
            console.log(`Login berhasil sebagai: ${userProfile.role}`);

        } catch (err: any) {
            // Tangani error custom dari fungsi auth kita (kedaluwarsa, profil tidak ada)
            if (err.message.includes('kedaluwarsa') || err.message.includes('ditemukan')) {
                setError(err.message);
            } else {
                // Tangani error standar dari Firebase Auth
                const errorCode = err.code;
                if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                    setError('Email atau password salah.');
                } else {
                    setError('Terjadi kesalahan saat login. Coba lagi nanti.');
                    console.error("Login Error:", err);
                }
            }
        } finally {
            // Pastikan loading berhenti apa pun hasilnya
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.app}>
            <div style={styles.loginContainer}>
                <div style={styles.loginCard}>
                    <div style={{ color: 'var(--primary-color)' }}>
                        <LockIcon size={32} />
                    </div>
                    <h1 style={styles.loginTitle}>Login</h1>
                    <p style={styles.loginSubtitle}>Selamat datang! Silakan masuk.</p>
                    <form onSubmit={handleSubmit}>
                        <div style={{ ...styles.formGroup, textAlign: 'left' }}>
                            <label htmlFor="email" style={styles.formLabel}>Email</label>
                            <input
                                ref={emailInputRef}
                                id="email"
                                type="email"
                                style={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                placeholder="contoh: admin@app.com"
                            />
                        </div>
                        <div style={{ ...styles.formGroup, textAlign: 'left' }}>
                            <label htmlFor="password" style={styles.formLabel}>Password</label>
                            <input
                                id="password"
                                type="password"
                                style={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '-8px', marginBottom: '16px' }}>{error}</p>}
                        <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary, width: '100%', justifyContent: 'center' }} disabled={isLoading}>
                            {isLoading && <div className="spinner"></div>}
                            {isLoading ? 'Memproses...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
