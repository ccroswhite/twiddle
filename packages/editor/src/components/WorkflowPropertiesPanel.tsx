import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { WorkflowProperty, WorkflowSchedule } from '@/lib/api';
import { WorkflowScheduleTab } from './properties/workflow/WorkflowScheduleTab';
import { WorkflowVariablesTab } from './properties/workflow/WorkflowVariablesTab';

// Re-export for convenience (used by WorkflowEditor)
export type { WorkflowProperty, WorkflowSchedule };

interface WorkflowPropertiesPanelProps {
    properties: WorkflowProperty[];
    schedule: WorkflowSchedule;
    onAddProperty: () => void;
    onUpdateProperty: (id: string, updates: Partial<WorkflowProperty>) => void;
    onDeleteProperty: (id: string) => void;
    onUpdateSchedule: (updates: Partial<WorkflowSchedule>) => void;
    onClose: () => void;
}

export function WorkflowPropertiesPanel({
    properties,
    schedule,
    onAddProperty,
    onUpdateProperty,
    onDeleteProperty,
    onUpdateSchedule,
    onClose,
}: WorkflowPropertiesPanelProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

    const validateValue = (type: string, value: string): string | null => {
        if (!value) return null; // Empty is allowed

        switch (type) {
            case 'number':
                if (!/^-?\d+\.?\d*$/.test(value)) {
                    return 'Must be a valid number';
                }
                return null;

            case 'array':
                if (!/^\[.*\]$/.test(value.trim())) {
                    return 'Must be a valid Python array like [1, 2, 3]';
                }
                return null;

            case 'boolean':
            case 'string':
                return null;

            default:
                return null;
        }
    };

    const handleValueChange = (id: string, value: string, type: string) => {
        const error = validateValue(type, value);
        setErrors((prev) => ({
            ...prev,
            [id]: error || '',
        }));
        onUpdateProperty(id, { value });
    };

    const handleTypeChange = (id: string, newType: WorkflowProperty['type']) => {
        const property = properties.find((p) => p.id === id);
        if (!property) return;

        // Reset value when changing type
        let newValue = '';
        if (newType === 'boolean') {
            newValue = 'True';
        }

        onUpdateProperty(id, { type: newType, value: newValue });
        setErrors((prev) => ({ ...prev, [id]: '' }));
    };

    return (
        <div className="h-full w-full bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Properties</h2>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Schedule Section */}
            <WorkflowScheduleTab
                schedule={schedule}
                onUpdateSchedule={onUpdateSchedule}
            />

            {/* Add Button */}
            <div className="px-4 py-3 border-b border-slate-200">
                <button
                    onClick={onAddProperty}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors w-full justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Add Property
                </button>
            </div>

            {/* Properties List */}
            <WorkflowVariablesTab
                properties={properties}
                expandedPropertyId={expandedPropertyId}
                setExpandedPropertyId={setExpandedPropertyId}
                errors={errors}
                onUpdateProperty={onUpdateProperty}
                onDeleteProperty={onDeleteProperty}
                handleTypeChange={handleTypeChange}
                handleValueChange={handleValueChange}
            />

            {/* Footer Info */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-600">
                    Properties are global variables accessible to all nodes in this workflow.
                </p>
            </div>
        </div>
    );
}
