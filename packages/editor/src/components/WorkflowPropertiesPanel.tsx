import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { WorkflowProperty, WorkflowSchedule } from '@/lib/api';

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
            <div className="border-b border-slate-200">
                <div className="px-4 py-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={schedule.enabled}
                            onChange={(e) => onUpdateSchedule({ enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {schedule.enabled && (
                    <div className="px-4 pb-3 space-y-3">
                        {/* Mode Selector */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onUpdateSchedule({ mode: 'simple' })}
                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${schedule.mode === 'simple'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                Simple
                            </button>
                            <button
                                onClick={() => onUpdateSchedule({ mode: 'cron' })}
                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${schedule.mode === 'cron'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                Advanced
                            </button>
                        </div>

                        {/* Simple Mode */}
                        {schedule.mode === 'simple' && (
                            <div className="space-y-2">
                                {/* Frequency Selector */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Frequency
                                    </label>
                                    <select
                                        value={schedule.simple?.frequency || 'daily'}
                                        onChange={(e) =>
                                            onUpdateSchedule({
                                                simple: {
                                                    ...schedule.simple,
                                                    frequency: e.target.value as any,
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="minutes">Every N Minutes</option>
                                        <option value="hours">Every N Hours</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                {/* Interval for Minutes/Hours */}
                                {(schedule.simple?.frequency === 'minutes' || schedule.simple?.frequency === 'hours') && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Every
                                        </label>
                                        <select
                                            value={schedule.simple?.interval || (schedule.simple?.frequency === 'minutes' ? 15 : 1)}
                                            onChange={(e) =>
                                                onUpdateSchedule({
                                                    simple: {
                                                        frequency: schedule.simple?.frequency || 'daily',
                                                        ...schedule.simple,
                                                        interval: parseInt(e.target.value),
                                                    },
                                                })
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {schedule.simple?.frequency === 'minutes' ? (
                                                <>
                                                    <option value="5">5 minutes</option>
                                                    <option value="10">10 minutes</option>
                                                    <option value="15">15 minutes</option>
                                                    <option value="30">30 minutes</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="1">1 hour</option>
                                                    <option value="2">2 hours</option>
                                                    <option value="4">4 hours</option>
                                                    <option value="6">6 hours</option>
                                                    <option value="12">12 hours</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {/* Time Picker for Daily/Weekly/Monthly */}
                                {schedule.simple?.frequency && ['daily', 'weekly', 'monthly'].includes(schedule.simple.frequency) && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={schedule.simple?.time || '09:00'}
                                            onChange={(e) =>
                                                onUpdateSchedule({
                                                    simple: {
                                                        frequency: schedule.simple?.frequency || 'daily',
                                                        ...schedule.simple,
                                                        time: e.target.value,
                                                    },
                                                })
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}

                                {/* Days of Week for Weekly */}
                                {schedule.simple?.frequency === 'weekly' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Days of Week
                                        </label>
                                        <div className="flex gap-1">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                                const isSelected = schedule.simple?.daysOfWeek?.includes(index) || false;
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            const current = schedule.simple?.daysOfWeek || [];
                                                            const updated = isSelected
                                                                ? current.filter((d: number) => d !== index)
                                                                : [...current, index].sort();
                                                            onUpdateSchedule({
                                                                simple: {
                                                                    frequency: schedule.simple?.frequency || 'daily',
                                                                    ...schedule.simple,
                                                                    daysOfWeek: updated,
                                                                },
                                                            });
                                                        }}
                                                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Day of Month for Monthly */}
                                {schedule.simple?.frequency === 'monthly' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Day of Month
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={schedule.simple?.dayOfMonth || 1}
                                            onChange={(e) =>
                                                onUpdateSchedule({
                                                    simple: {
                                                        frequency: schedule.simple?.frequency || 'daily',
                                                        ...schedule.simple,
                                                        dayOfMonth: parseInt(e.target.value),
                                                    },
                                                })
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}

                                {/* Timezone */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Timezone
                                    </label>
                                    <select
                                        value={schedule.simple?.timezone || 'UTC'}
                                        onChange={(e) =>
                                            onUpdateSchedule({
                                                simple: {
                                                    frequency: schedule.simple?.frequency || 'daily',
                                                    ...schedule.simple,
                                                    timezone: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">US Eastern</option>
                                        <option value="America/Chicago">US Central</option>
                                        <option value="America/Denver">US Mountain</option>
                                        <option value="America/Los_Angeles">US Pacific</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Europe/Paris">Paris</option>
                                        <option value="Asia/Tokyo">Tokyo</option>
                                        <option value="Asia/Shanghai">Shanghai</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Advanced Mode (Cron) */}
                        {schedule.mode === 'cron' && (
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Cron Expression
                                    </label>
                                    <input
                                        type="text"
                                        value={schedule.cron || ''}
                                        onChange={(e) => onUpdateSchedule({ cron: e.target.value })}
                                        placeholder="*/15 * * * *"
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Format: minute hour day month weekday
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
            <div className="flex-1 overflow-y-auto">
                {properties.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        No properties defined.<br />
                        Click "Add Property" to create one.
                    </div>
                ) : (
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
                )}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-600">
                    Properties are global variables accessible to all nodes in this workflow.
                </p>
            </div>
        </div>
    );
}
