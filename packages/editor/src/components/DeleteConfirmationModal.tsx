/**
 * DeleteConfirmationModal
 * 
 * Confirmation dialog for deleting a workflow.
 * Shows warning for non-development environments.
 */

import { Trash2 } from 'lucide-react';
import type { Workflow } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface DeleteConfirmationModalProps {
    workflow: Workflow;
    onConfirm: () => void;
    onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmationModal({
    workflow,
    onConfirm,
    onCancel,
}: DeleteConfirmationModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                            Delete Workflow
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to delete <strong>"{workflow.name}"</strong>?
                            This action cannot be undone.
                        </p>
                        {workflow.environment !== 'DV' && (
                            <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                ⚠️ This workflow is in <strong>{workflow.environment}</strong> environment.
                                Deleting it may affect production systems.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Delete Workflow
                    </button>
                </div>
            </div>
        </div>
    );
}
