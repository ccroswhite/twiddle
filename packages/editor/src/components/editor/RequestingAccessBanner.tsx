interface RequestingAccessBannerProps {
    /** Optional custom message */
    message?: string;
}

/**
 * Pulsing banner shown when the current user is requesting edit access
 * to a workflow that someone else is editing.
 */
export function RequestingAccessBanner({ message = 'Requesting edit access...' }: RequestingAccessBannerProps) {
    return (
        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-lg px-6 py-3 rounded-full flex items-center gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
            <span className="font-medium text-slate-700">{message}</span>
        </div>
    );
}
