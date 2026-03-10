import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database', field: 'database', type: 'text' },
    {
      label: 'Authentication Type',
      field: 'role',
      type: 'select',
      options: [
        { value: 'sql', label: 'Username and Password' },
        { value: 'windows', label: 'Windows/AD Authentication' },
        { value: 'entra', label: 'Microsoft Entra ID' },
      ],
    },
    // Username and Password Auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'sql' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'sql' } },
    // Windows Auth fields
    { label: 'Domain', field: 'domain', type: 'text', showWhen: { field: 'role', value: 'windows' } },
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'windows' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'windows' } },
    // Entra ID Auth fields
    { label: 'Tenant ID', field: 'tenantId', type: 'text', showWhen: { field: 'role', value: 'entra' } },
    { label: 'Client ID', field: 'clientId', type: 'text', showWhen: { field: 'role', value: 'entra' } },
    { label: 'Client Secret', field: 'clientSecret', type: 'password', showWhen: { field: 'role', value: 'entra' } },
    // TLS options (always shown)
    { label: 'Encrypt Connection', field: 'useTls', type: 'checkbox' },
    { label: 'Trust Server Certificate', field: 'allowSelfSigned', type: 'checkbox' },
];

export const MssqlForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
