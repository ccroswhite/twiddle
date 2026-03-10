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
        { value: 'none', label: 'No Authentication' },
        { value: 'standard', label: 'Username/Password (SCRAM)' },
        { value: 'x509', label: 'X.509 Certificate' },
      ],
    },
    // Standard auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'standard' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'standard' } },
    { label: 'Auth Database', field: 'account', type: 'text', showWhen: { field: 'role', value: 'standard' } },
    // X.509 Certificate fields
    { label: 'Client Certificate (PEM)', field: 'tlsCert', type: 'textarea', showWhen: { field: 'role', value: 'x509' } },
    { label: 'Client Key (PEM)', field: 'tlsKey', type: 'textarea', showWhen: { field: 'role', value: 'x509' } },
    // TLS options (always shown)
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const MongoForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
