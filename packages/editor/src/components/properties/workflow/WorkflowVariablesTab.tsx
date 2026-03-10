import { ChevronDown, Trash2 } from 'lucide-react';
import type { WorkflowProperty } from '@/lib/api';

interface WorkflowVariablesTabProps {
    properties: WorkflowProperty[];
    expandedPropertyId: string | null;
    setExpandedPropertyId: (id: string | null) => void;
    errors: Record<string, string>;
    onUpdateProperty: (id: string, updates: Partial<WorkflowProperty>) => void;
    onDeleteProperty: (id: string) => void;
    handleTypeChange: (id: string, newType: WorkflowProperty['type']) => void;
    handleValueChange: (id: string, value: string, type: string) => void;
}

export function WorkflowVariablesTab({
    properties,
    expandedPropertyId,
    setExpandedPropertyId,
    errors,
    onUpdateProperty,
    onDeleteProperty,
    handleTypeChange,
    handleValueChange,
}: WorkflowVariablesTabProps) {
    if (properties.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    No properties defined.<br />
                    Click "Add Property" to create one.
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 space-y-2">
                {properties.map((property) => {
                    const isExpanded = expandedPropertyId === property.id;
                    const displayName = property.key || 'Unnamed Property';

                    return (
                        <div
                            key={property.id}
                            className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden"
                        >
                            {/* Collapsed Header - Always visible */}
                            <button
                                onClick={() => setExpandedPropertyId(isExpanded ? null : property.id)}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                    />
                                    <span className="font-medium text-slate-900 text-sm">
                                        {displayName}
                                    </span>
                                    {!isExpanded && property.type && (
                                        <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                                            {property.type}
                                        </span>
                                    )}
                                </div>
                                {!isExpanded && (
                                    <span className="text-xs text-slate-500 truncate max-w-[120px]">
                                        {property.value || '(no value)'}
                                    </span>
                                )}
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-3">
                                    {/* Property Name Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Property Name
                                        </label>
                                        <input
                                            type="text"
                                            value={property.key}
                                            onChange={(e) =>
                                                onUpdateProperty(property.id, { key: e.target.value })
                                            }
                                            placeholder="property_name"
                                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Type Selector */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Type
                                        </label>
                                        <select
                                            value={property.type}
                                            onChange={(e) =>
                                                handleTypeChange(property.id, e.target.value as WorkflowProperty['type'])
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="array">Array</option>
                                        </select>
                                    </div>

                                    {/* Value Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Value
                                        </label>
                                        {property.type === 'boolean' ? (
                                            <select
                                                value={property.value}
                                                onChange={(e) =>
                                                    onUpdateProperty(property.id, { value: e.target.value })
                                                }
                                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="True">True</option>
                                                <option value="False">False</option>
                                            </select>
                                        ) : property.type === 'array' ? (
                                            <textarea
                                                value={property.value}
                                                onChange={(e) =>
                                                    handleValueChange(property.id, e.target.value, property.type)
                                                }
                                                placeholder="[1, 2, 3]"
                                                rows={2}
                                                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${errors[property.id]
                                                    ? 'border-red-500'
                                                    : 'border-slate-300'
                                                    }`}
                                            />
                                        ) : (
                                            <input
                                                type={property.type === 'number' ? 'text' : 'text'}
                                                value={property.value}
                                                onChange={(e) =>
                                                    handleValueChange(property.id, e.target.value, property.type)
                                                }
                                                placeholder={
                                                    property.type === 'number' ? '42' : 'value'
                                                }
                                                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[property.id]
                                                    ? 'border-red-500'
                                                    : 'border-slate-300'
                                                    }`}
                                            />
                                        )}
                                        {errors[property.id] && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {errors[property.id]}
                                            </p>
                                        )}
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => onDeleteProperty(property.id)}
                                        className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Property
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
