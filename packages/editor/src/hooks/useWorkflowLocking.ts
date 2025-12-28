import { useState, useEffect, useCallback } from 'react';
import { workflowsApi } from '@/lib/api';

/**
 * User who holds a lock on the workflow
 */
export interface LockHolder {
    id: string;
    name: string;
    email: string;
    isMe: boolean;
}

/**
 * Takeover request from another user
 */
export interface TakeoverRequest {
    userId: string;
    name: string;
    email: string;
    requestedAt: string;
}

/**
 * Return type for the useWorkflowLocking hook
 */
export interface UseWorkflowLockingReturn {
    /** Whether the workflow is read-only (locked by someone else) */
    isReadOnly: boolean;
    /** Who currently holds the lock */
    lockedBy: LockHolder | null;
    /** Pending takeover request from another user */
    takeoverRequest: TakeoverRequest | null;
    /** Whether we're waiting for our lock request to be accepted */
    requestingLock: boolean;
    /** Request to take over the lock */
    handleRequestLock: () => Promise<void>;
    /** Accept or deny a takeover request */
    handleResolveLock: (action: 'ACCEPT' | 'DENY') => Promise<void>;
    /** Update lock state from workflow load */
    updateLockState: (lockInfo: { isReadOnly: boolean; lockedBy: LockHolder | null }) => void;
}

/**
 * Custom hook for managing workflow locking.
 * 
 * Handles:
 * - Heartbeat to maintain lock
 * - Takeover request/response
 * - Lock polling when requesting
 * - Unlock on unmount
 * 
 * @param workflowId - Current workflow ID (null/undefined for new workflows)
 * @param isNew - Whether this is a new (unsaved) workflow
 * @param onReloadWorkflow - Callback to reload the workflow when lock state changes
 * @returns Lock state and control functions
 */
export function useWorkflowLocking(
    workflowId: string | undefined,
    isNew: boolean,
    onReloadWorkflow: (id: string) => void
): UseWorkflowLockingReturn {
    // Locking state
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockedBy, setLockedBy] = useState<LockHolder | null>(null);
    const [takeoverRequest, setTakeoverRequest] = useState<TakeoverRequest | null>(null);
    const [requestingLock, setRequestingLock] = useState(false);

    // Heartbeat loop - only when we hold the lock
    useEffect(() => {
        if (!workflowId || isNew || isReadOnly) return;

        const interval = setInterval(async () => {
            try {
                const response = await workflowsApi.heartbeat(workflowId);
                if (response.request) {
                    setTakeoverRequest(response.request);
                } else {
                    setTakeoverRequest(null);
                }
            } catch (err) {
                console.error('Heartbeat failed:', err);
                onReloadWorkflow(workflowId);
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [workflowId, isNew, isReadOnly, onReloadWorkflow]);

    // Takeover Request Polling - when we're waiting for lock
    useEffect(() => {
        if (!workflowId || !requestingLock || !isReadOnly) return;

        const interval = setInterval(async () => {
            try {
                // Poll to see if we got the lock
                onReloadWorkflow(workflowId);
            } catch {
                // ignore
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [workflowId, requestingLock, isReadOnly, onReloadWorkflow]);

    // Reset requestingLock when we get write access
    useEffect(() => {
        if (!isReadOnly) {
            setRequestingLock(false);
        }
    }, [isReadOnly]);

    // Unlock on unmount
    useEffect(() => {
        return () => {
            if (workflowId && !isNew && !isReadOnly && lockedBy?.isMe) {
                workflowsApi.unlock(workflowId).catch(console.error);
            }
        };
    }, [workflowId, isNew, isReadOnly, lockedBy]);

    // Request to take over the lock
    const handleRequestLock = useCallback(async () => {
        if (!workflowId || !isReadOnly) return;
        try {
            const res = await workflowsApi.requestLock(workflowId);
            if (res.status === 'acquired') {
                // We got it immediately (unlocked)
                onReloadWorkflow(workflowId);
            } else if (res.status === 'requested') {
                setRequestingLock(true);
            }
        } catch {
            alert('Failed to request lock');
        }
    }, [workflowId, isReadOnly, onReloadWorkflow]);

    // Accept or deny a takeover request
    const handleResolveLock = useCallback(async (action: 'ACCEPT' | 'DENY') => {
        if (!workflowId || !takeoverRequest) return;
        try {
            await workflowsApi.resolveLock(workflowId, action);
            setTakeoverRequest(null);
            if (action === 'ACCEPT') {
                // We yielded, so reload to become ReadOnly
                onReloadWorkflow(workflowId);
            }
        } catch {
            alert('Failed to resolve lock');
        }
    }, [workflowId, takeoverRequest, onReloadWorkflow]);

    // Update lock state from workflow load
    const updateLockState = useCallback((lockInfo: { isReadOnly: boolean; lockedBy: LockHolder | null }) => {
        setIsReadOnly(lockInfo.isReadOnly);
        setLockedBy(lockInfo.lockedBy);
    }, []);

    return {
        isReadOnly,
        lockedBy,
        takeoverRequest,
        requestingLock,
        handleRequestLock,
        handleResolveLock,
        updateLockState,
    };
}
