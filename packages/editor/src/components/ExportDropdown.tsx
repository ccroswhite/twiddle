/**
 * ExportDropdown
 * 
 * Dropdown menu for exporting workflows to different formats:
 * - Temporal Python
 * - Airflow DAG
 * - Twiddle IR (JSON)
 */

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Workflow, Wind, FileJson } from 'lucide-react';

export type ExportFormat = 'temporal' | 'airflow' | 'ir';

export interface ExportDropdownProps {
    disabled: boolean;
    onExport: (format: ExportFormat) => void;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
    {
        format: 'temporal',
        label: 'Temporal Python',
        icon: <Workflow className="w-4 h-4" />,
        description: 'Python Temporal application',
    },
    {
        format: 'airflow',
        label: 'Airflow DAG',
        icon: <Wind className="w-4 h-4" />,
        description: 'Apache Airflow DAG file',
    },
    {
        format: 'ir',
        label: 'Twiddle IR',
        icon: <FileJson className="w-4 h-4" />,
        description: 'Intermediate representation (JSON)',
    },
];

export function ExportDropdown({ disabled, onExport }: ExportDropdownProps) {
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

    const handleExport = (format: ExportFormat) => {
        setIsOpen(false);
        onExport(format);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export workflow"
            >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    {EXPORT_OPTIONS.map((option) => (
                        <button
                            key={option.format}
                            onClick={() => handleExport(option.format)}
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
