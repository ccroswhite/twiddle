/**
 * Custom hook for managing workflow locking state
 */

import { useState, useEffect, useCallback } from 'react';
import { workflowsApi } from '@/lib/api';

export function useWorkflowLocking(workflowId?: string) {
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockedBy, setLockedBy] = useState<{
        id: string;
        name: string;
        email: string;
        isMe: boolean;
    } | null>(null);
    const [takeoverRequest, setTakeoverRequest] = useState<{
        userId: string;
        name: string;
        email: string;
        requestedAt: string;
    } | null>(null);
    const [requestingLock, setRequestingLock] = useState(false);

    /**
     * Check lock status from API
     */
    const checkLockStatus = useCallback(async () => {
        if (!workflowId) return;

        try {
            const lock = await workflowsApi.checkLock(workflowId);

            if (lock.isLocked) {
                setIsReadOnly(!lock.lockedBy.isMe);
                setLockedBy(lock.lockedBy);
            } else {
                setIsReadOnly(false);
                setLockedBy(null);
            }

            if (lock.takeoverRequest) {
                setTakeoverRequest(lock.takeoverRequest);
            }
        } catch (err) {
            console.error('Failed to check lock status:', err);
        }
    }, [workflowId]);

    /**
     * Request lock for editing
     */
    const requestLock = useCallback(async () => {
        if (!workflowId) return;

        setRequestingLock(true);
        try {
            await workflowsApi.requestLock(workflowId);
            await checkLockStatus();
        } catch (err) {
            alert(`Failed to request lock: ${(err as Error).message}`);
        } finally {
            setRequestingLock(false);
        }
    }, [workflowId, checkLockStatus]);

    /**
     * Release lock
     */
    const releaseLock = useCallback(async () => {
        if (!workflowId) return;

        try {
            await workflowsApi.releaseLock(workflowId);
            setIsReadOnly(false);
            setLockedBy(null);
        } catch (err) {
            console.error('Failed to release lock:', err);
        }
    }, [workflowId]);

    /**
     * Handle takeover request approval/denial
     */
    const handleTakeoverResponse = useCallback(
        async (approve: boolean) => {
            if (!workflowId || !takeoverRequest) return;

            try {
                if (approve) {
                    await workflowsApi.approveTakeover(workflowId);
                    setIsReadOnly(true);
                } else {
                    await workflowsApi.denyTakeover(workflowId);
                }
                setTakeoverRequest(null);
            } catch (err) {
                alert(`Failed to handle takeover: ${(err as Error).message}`);
            }
        },
        [workflowId, takeoverRequest]
    );

    // Poll for lock status changes
    useEffect(() => {
        if (!workflowId) return;

        checkLockStatus();
        const interval = setInterval(checkLockStatus, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [workflowId, checkLockStatus]);

    return {
        isReadOnly,
        lockedBy,
        takeoverRequest,
        requestingLock,
        requestLock,
        releaseLock,
        handleTakeoverResponse,
        checkLockStatus,
    };
}
