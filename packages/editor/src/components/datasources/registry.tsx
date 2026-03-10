import React, { useMemo } from 'react';
import type { DataSourceData } from '@/lib/api';

export interface DataSourceFormProps {
    data: DataSourceData;
    onDataChange: (field: keyof DataSourceData, value: string | number | boolean) => void;
    showPasswords: Record<string, boolean>;
    onTogglePasswordVisibility: (field: string) => void;
    isEditMode?: boolean;
}

export type DataSourceFormComponent = React.FC<DataSourceFormProps>;

const registry = new Map<string, DataSourceFormComponent>();

export function registerDataSourceForm(type: string, component: DataSourceFormComponent) {
    registry.set(type, component);
}

export function getDataSourceForm(type: string): DataSourceFormComponent | undefined {
    return registry.get(type);
}

// Higher-order component to optionally render the correct form
export const DynamicDataSourceForm: React.FC<DataSourceFormProps & { type: string }> = ({ type, ...props }) => {
    const Component = useMemo(() => getDataSourceForm(type), [type]);

    if (!Component) {
        return <div className="p-4 text-sm text-yellow-600 bg-yellow-50 rounded-md">Form not implemented for {type}</div>;
    }

    return <Component {...props} />;
};
