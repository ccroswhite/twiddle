/**
 * ViewCodeDropdown
 * 
 * Dropdown menu for viewing generated code in different formats:
 * - Temporal Python
 * - Airflow DAG
 */

import { useState, useRef, useEffect } from 'react';
import { Code, ChevronDown, Workflow, Wind } from 'lucide-react';

export type ViewCodeFormat = 'temporal' | 'airflow';

export interface ViewCodeDropdownProps {
    disabled: boolean;
    onViewCode: (format: ViewCodeFormat) => void;
}

const VIEW_CODE_OPTIONS: { format: ViewCodeFormat; label: string; icon: React.ReactNode; description: string }[] = [
    {
        format: 'temporal',
        label: 'Temporal Python',
        icon: <Workflow className="w-4 h-4" />,
        description: 'View Temporal workflow code',
    },
    {
        format: 'airflow',
        label: 'Airflow DAG',
        icon: <Wind className="w-4 h-4" />,
        description: 'View Airflow DAG code',
    },
];

export function ViewCodeDropdown({ disabled, onViewCode }: ViewCodeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleViewCode = (format: ViewCodeFormat) => {
        setIsOpen(false);
        onViewCode(format);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="View generated code"
            >
                <Code className="w-4 h-4" />
                View Code
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    {VIEW_CODE_OPTIONS.map((option) => (
                        <button
                            key={option.format}
                            onClick={() => handleViewCode(option.format)}
                            className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                            <span className="text-slate-500 mt-0.5">{option.icon}</span>
                            <div>
                                <div className="font-medium text-slate-700">{option.label}</div>
                                <div className="text-xs text-slate-400">{option.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
