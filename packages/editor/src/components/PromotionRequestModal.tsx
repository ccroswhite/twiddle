
import { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { promotionsApi, type WorkflowEnvironment } from '@/lib/api';

interface PromotionRequestModalProps {
    workflowId: string;
    workflowName: string;
    currentEnv: WorkflowEnvironment;
    nextEnv: WorkflowEnvironment;
    onClose: () => void;
    onSuccess: () => void;
}

export function PromotionRequestModal({
    workflowId,
    workflowName,
    currentEnv,
    nextEnv,
    onClose,
    onSuccess,
}: PromotionRequestModalProps) {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await promotionsApi.request(workflowId, notes.trim());
            onSuccess();
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Request Promotion</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="text-slate-600">
                                <span className="font-medium text-slate-900">{workflowName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEnvColor(currentEnv)}`}>{currentEnv}</span>
                                <span>→</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEnvColor(nextEnv)}`}>{nextEnv}</span>
                            </div>
                        </div>

                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                            Release Notes
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="Describe changes, bug fixes, or new features..."
                            required
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getEnvColor(env: WorkflowEnvironment) {
    switch (env) {
        case 'DV': return 'bg-blue-100 text-blue-700';
        case 'UT': return 'bg-purple-100 text-purple-700';
        case 'LT': return 'bg-orange-100 text-orange-700';
        case 'PD': return 'bg-green-100 text-green-700';
        default: return 'bg-slate-100 text-slate-700';
    }
}
