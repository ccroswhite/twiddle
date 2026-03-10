import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Account', field: 'account', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Warehouse', field: 'warehouse', type: 'text' },
    { label: 'Database', field: 'database', type: 'text' },
    { label: 'Role (optional)', field: 'role', type: 'text' },
];

export const SnowflakeForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
