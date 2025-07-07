
import React from 'react';
import { styles } from '../../styles';

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, width:'90%', maxWidth: '700px'}} onClick={e => e.stopPropagation()} className="modal-content-style">
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle} className="modal-title">{title}</h3>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, confirmText = 'Hapus', confirmButtonStyle = styles.buttonDanger }) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()} className="modal-content-style">
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle} className="modal-title">{title}</h3>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={{color: 'var(--text-secondary)'}}>{children}</div>
                <div style={styles.modalFooter} className="modal-footer-style">
                    <button onClick={onClose} style={{...styles.button, ...styles.buttonOutline}}>Batal</button>
                    <button onClick={onConfirm} style={{...styles.button, ...confirmButtonStyle}}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export const InfoModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
     return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()} className="modal-content-style">
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle} className="modal-title">{title}</h3>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                 <div style={{color: 'var(--text-secondary)'}}>{children}</div>
                <div style={styles.modalFooter} className="modal-footer-style">
                    <button onClick={onClose} style={{...styles.button, ...styles.buttonPrimary}}>OK</button>
                </div>
            </div>
        </div>
    );
};
