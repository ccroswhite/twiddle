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
    onSetEnforceExplicitDAG?: (enabled: boolean) => void; // Optional for backward compatibility with older implementations
    onClose: () => void;
}

export function WorkflowPropertiesPanel({
    properties,
    schedule,
    onAddProperty,
    onUpdateProperty,
    onDeleteProperty,
    onUpdateSchedule,
    onSetEnforceExplicitDAG,
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

            {/* Linter Settings Section */}
            <div className="px-4 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Linter Settings</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-slate-900">Enforce Explicit DAG</div>
                        <div className="text-xs text-slate-500 mt-0.5">Require visual edges for all wait conditions</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={(() => {
                                const prop = properties.find(p => p.key === 'twiddle.enforceExplicitDAG');
                                return prop ? prop.value === 'true' : true;
                            })()}
                            onChange={(e) => {
                                if (onSetEnforceExplicitDAG) {
                                    onSetEnforceExplicitDAG(e.target.checked);
                                }
                            }}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
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
