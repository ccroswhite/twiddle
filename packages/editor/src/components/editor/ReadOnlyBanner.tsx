import { Lock } from 'lucide-react';

interface LockHolder {
    name: string;
    email: string;
}

interface ReadOnlyBannerProps {
    lockedBy: LockHolder;
}

/**
 * Banner displayed when the workflow is locked by another user.
 * Shows who has the lock and indicates read-only mode.
 */
export function ReadOnlyBanner({ lockedBy }: ReadOnlyBannerProps) {
    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Read Only Mode</span>
            <span className="text-amber-700">•</span>
            <span>
                This workflow is currently being edited by <strong>{lockedBy.name}</strong> ({lockedBy.email}). You cannot make changes.
            </span>
        </div>
    );
}
