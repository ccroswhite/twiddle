import { User } from 'lucide-react';

interface TakeoverRequest {
    name: string;
    email: string;
}

interface TakeoverRequestModalProps {
    request: TakeoverRequest;
    onAccept: () => void;
    onDeny: () => void;
}

/**
 * Modal dialog shown when another user requests edit access to a workflow
 * that the current user is editing.
 */
export function TakeoverRequestModal({ request, onAccept, onDeny }: TakeoverRequestModalProps) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">Edit Access Requested</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            <strong>{request.name}</strong> ({request.email}) is requesting to edit this workflow.
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            If you do not respond within 1 minute, access will be automatically transferred.
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onDeny}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                    >
                        Deny
                    </button>
                    <button
                        onClick={onAccept}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Allow Access
                    </button>
                </div>
            </div>
        </div>
    );
}
