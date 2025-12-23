import React from 'react';

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
}

/**
 * Shared right-side panel component used for workflow browser, properties panel, etc.
 * Automatically positions below the header using CSS variables.
 */
export function RightPanel({
    isOpen,
    onClose,
    children,
    className = '',
    showBackdrop = false,
    zIndex = 'z-40',
}: RightPanelProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            {showBackdrop && onClose && (
                <div
                    className={`fixed inset-0 bg-black/20 ${zIndex}`}
                    style={{ top: 'var(--header-height, 88px)' }}
                    onClick={onClose}
                />
            )}

            {/* Panel Container */}
            <div
                className={`fixed right-0 inset-y-0 ${zIndex} ${className}`}
                style={{ top: 'var(--header-height, 88px)' }}
            >
                <div className="h-full">
                    {children}
                </div>
            </div>
        </>
    );
}
