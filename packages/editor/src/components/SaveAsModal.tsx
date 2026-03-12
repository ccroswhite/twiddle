import { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';

interface SaveAsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    defaultName?: string;
}

export function SaveAsModal({ isOpen, onClose, onSave, defaultName = '' }: SaveAsModalProps) {
    const [name, setName] = useState(defaultName);

    // Reset name when modal opens
    useEffect(() => {
        if (isOpen) {
            setName(`${defaultName} (Copy)`);
        }
    }, [isOpen, defaultName]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Copy className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-semibold text-slate-800">Save As Copy</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 mb-4">
                            This workflow is read-only. Save it as a new copy to make edits.
                        </p>
                        <div>
                            <label htmlFor="cloneName" className="block text-sm font-medium text-slate-700 mb-1">
                                New Workflow Name
                            </label>
                            <input
                                id="cloneName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="My Workflow (Copy)"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            Create Copy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
