/**
 * VersionHistoryModal
 * 
 * Modal for viewing and managing workflow version history.
 * Supports opening past versions in read-only mode and restoring to previous versions.
 */

import { X } from 'lucide-react';
import type { Workflow } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowVersion {
    id: string;
    version: number;
    createdAt: string;
    createdBy?: {
        name?: string;
        email?: string;
    };
}

export interface VersionHistoryModalProps {
    workflow: Workflow;
    versions: WorkflowVersion[];
    loading: boolean;
    onClose: () => void;
    onOpenVersion: (version: WorkflowVersion) => void;
    onRestoreVersion: (version: WorkflowVersion) => void;
}

// =============================================================================
// Component
// =============================================================================

export function VersionHistoryModal({
    workflow,
    versions,
    loading,
    onClose,
    onOpenVersion,
    onRestoreVersion,
}: VersionHistoryModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-neutral-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col border border-neutral-700">
                {/* Header */}
                <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">
                        Version History: {workflow.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center text-neutral-400 py-8">
                            Loading versions...
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center text-neutral-400 py-8">
                            No version history available
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {versions.map((ver) => (
                                <div
                                    key={ver.id}
                                    className="flex items-center justify-between p-3 bg-neutral-900/50 rounded border border-neutral-700/50 hover:border-neutral-600"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">
                                                Version {ver.version}
                                            </span>
                                            <span className="text-xs text-neutral-500">
                                                {new Date(ver.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-neutral-400 mt-1">
                                            Saved by {ver.createdBy?.name || ver.createdBy?.email || 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onOpenVersion(ver)}
                                            className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded"
                                        >
                                            Open
                                        </button>
                                        <button
                                            onClick={() => onRestoreVersion(ver)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                                        >
                                            Restore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
