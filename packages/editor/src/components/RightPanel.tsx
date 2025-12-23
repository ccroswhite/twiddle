import React, { useState, useEffect } from 'react';

interface RightPanelProps {
    isOpen: boolean;
    onClose?: () => void;
    children: React.ReactNode;
    /** Optional className for additional styling */
    className?: string;
    /** Whether to show a backdrop overlay */
    showBackdrop?: boolean;
    /** Custom z-index, defaults to z-40 */
    zIndex?: string;
    /** Custom width, defaults to w-[480px] */
    width?: string;
}

/**
 * Shared right-side panel component used for workflow browser, properties panel, etc.
 * Automatically positions below the header using CSS variables and handles slide animations.
 */
export function RightPanel({
    isOpen,
    onClose,
    children,
    className = '',
    showBackdrop = true,
    zIndex = 'z-40',
    width = 'w-[480px]',
}: RightPanelProps) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (onClose) {
            setIsClosing(true);
            // Wait for animation to complete before actually closing
            setTimeout(() => {
                onClose();
            }, 200); // Match animation duration
        }
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`absolute inset-0 ${zIndex} flex justify-end`} style={{ top: 'var(--header-height)' }}>
            {/* Backdrop */}
            {showBackdrop && (
                <div
                    className={`absolute inset-0 bg-black/20 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'
                        }`}
                    onClick={handleClose}
                />
            )}

            {/* Panel */}
            <div
                className={`relative ${width} bg-white shadow-xl flex flex-col ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
                    } ${className}`}
            >
                {children}
            </div>
        </div>
    );
}
