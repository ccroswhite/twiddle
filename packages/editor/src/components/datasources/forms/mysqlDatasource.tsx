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
        { value: 'password', label: 'Username and Password' },
        { value: 'entra', label: 'Microsoft Entra ID' },
        { value: 'mtls', label: 'Mutual TLS (Client Certificate)' },
      ],
    },
    // Username and Password auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'password' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'password' } },
    // Entra ID Auth fields
    { label: 'Tenant ID', field: 'tenantId', type: 'text', showWhen: { field: 'role', value: 'entra' } },
    { label: 'Client ID', field: 'clientId', type: 'text', showWhen: { field: 'role', value: 'entra' } },
    { label: 'Client Secret', field: 'clientSecret', type: 'password', showWhen: { field: 'role', value: 'entra' } },
    // mTLS auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'mtls' } },
    { label: 'Client Certificate (PEM)', field: 'tlsCert', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    { label: 'Client Key (PEM)', field: 'tlsKey', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    { label: 'CA Certificate (PEM)', field: 'tlsCa', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    // TLS options (always shown)
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const MysqlForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
