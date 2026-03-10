import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { DataSourceData } from '@/lib/api';

export interface FieldDefinition {
    label: string;
    field: string & keyof DataSourceData;
    type: 'text' | 'password' | 'textarea' | 'number' | 'checkbox' | 'select';
    options?: { value: string; label: string }[];
    placeholder?: string;
    showWhen?: { field: string & keyof DataSourceData; value: string };
}

export interface DataSourceFieldsRendererProps {
    fields: FieldDefinition[];
    data: DataSourceData;
    onDataChange: (field: keyof DataSourceData, value: string | number | boolean) => void;
    showPasswords: Record<string, boolean>;
    onTogglePasswordVisibility: (field: string) => void;
    isEditMode?: boolean;
    keyPrefix?: string;
}

export const DataSourceFieldsRenderer: React.FC<DataSourceFieldsRendererProps> = ({
    fields,
    data,
    onDataChange,
    showPasswords,
    onTogglePasswordVisibility,
    isEditMode = false,
    keyPrefix = '',
}) => {
    return (
        <>
            {fields.map((field) => {
                // Check conditional visibility
                if (field.showWhen) {
                    const conditionField = field.showWhen.field;
                    const conditionValue = field.showWhen.value;
                    if (data[conditionField] !== conditionValue) {
                        return null; // Don't render if condition is not met
                    }
                }

                const domId = `${keyPrefix}-${field.field}`;

                return (
                    <div key={field.field} className="space-y-1">
                        <label htmlFor={domId} className="block text-sm font-medium text-gray-700">
                            {field.label}
                        </label>

                        {field.type === 'password' ? (
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type={showPasswords[field.field] ? 'text' : 'password'}
                                    id={domId}
                                    value={data[field.field] as string || ''}
                                    onChange={(e) => onDataChange(field.field, e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    placeholder={isEditMode ? '••••••••' : field.placeholder}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    onClick={() => onTogglePasswordVisibility(field.field)}
                                >
                                    {showPasswords[field.field] ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        ) : field.type === 'textarea' ? (
                            <textarea
                                id={domId}
                                rows={4}
                                value={data[field.field] as string || ''}
                                onChange={(e) => onDataChange(field.field, e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs"
                                placeholder={isEditMode ? '•••••••• (encrypted)' : field.placeholder}
                            />
                        ) : field.type === 'checkbox' ? (
                            <div className="flex items-center h-5">
                                <input
                                    id={domId}
                                    type="checkbox"
                                    checked={!!data[field.field]}
                                    onChange={(e) => onDataChange(field.field, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </div>
                        ) : field.type === 'select' ? (
                            <select
                                id={domId}
                                value={data[field.field] as string || field.options?.[0]?.value || ''}
                                onChange={(e) => onDataChange(field.field, e.target.value)}
                                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            >
                                {field.options?.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={field.type}
                                id={domId}
                                value={data[field.field] as string | number || ''}
                                onChange={(e) => onDataChange(field.field, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder={field.placeholder}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
};
