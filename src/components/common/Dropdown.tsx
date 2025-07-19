import React, { useState, useEffect, useRef } from 'react';

type MenuItem = {
    label?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    isSeparator?: boolean;
}

interface DropdownProps {
    trigger: React.ReactElement<React.HTMLProps<HTMLElement>>;
    menuItems: MenuItem[];
    menuPositionStyle?: React.CSSProperties;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, menuItems, menuPositionStyle = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const handleTriggerClick = (e: React.MouseEvent) => { e.stopPropagation(); setIsOpen(prev => !prev); };
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const menuBaseStyle: React.CSSProperties = {
        position: 'absolute', right: 0, top: 'calc(100% + 8px)', backgroundColor: 'var(--bg-content)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '240px', border: '1px solid var(--border-color)',
        overflow: 'hidden', listStyle: 'none', padding: '8px 0', margin: 0,
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {React.cloneElement(trigger, {
                ...trigger.props,
                onClick: (e: React.MouseEvent<HTMLElement>) => {
                    handleTriggerClick(e);
                    if (trigger.props.onClick) {
                        trigger.props.onClick(e);
                    }
                },
                'aria-haspopup': true,
                'aria-expanded': isOpen
            })}
            {isOpen && (
                <ul style={{ ...menuBaseStyle, ...menuPositionStyle }}>
                    {menuItems.map((item, index) => {
                         if (item.isSeparator) {
                            return <li key={`sep-${index}`}><hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} /></li>;
                        }
                        return (
                        <li key={index}>
                            <button 
                              onClick={() => { if(item.onClick) item.onClick(); setIsOpen(false); }}
                              className="dropdown-item"
                              style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'transparent',
                                border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-primary)', transition: 'background-color 0.2s' }}
                            >
                                {item.icon && <span style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
                                {item.label}
                            </button>
                        </li>
                    )})}
                </ul>
            )}
        </div>
    );
};