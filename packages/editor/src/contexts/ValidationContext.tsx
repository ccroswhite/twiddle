import { createContext, useContext } from 'react';
import type { ValidationIssue } from '@/hooks/useWorkflowValidator';

export const ValidationContext = createContext<ValidationIssue[]>([]);

export function useValidation() {
    return useContext(ValidationContext);
}
