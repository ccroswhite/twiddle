import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    {
      label: 'Authentication Type',
      field: 'role',
      type: 'select',
      options: [
        { value: 'acl', label: 'Username and Password' },
        { value: 'mtls', label: 'Mutual TLS (Client Certificate)' },
      ],
    },
    // Username and Password auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'acl' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'acl' } },
    // mTLS auth fields
    { label: 'Client Certificate (PEM)', field: 'tlsCert', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    { label: 'Client Key (PEM)', field: 'tlsKey', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    { label: 'CA Certificate (PEM)', field: 'tlsCa', type: 'textarea', showWhen: { field: 'role', value: 'mtls' } },
    // TLS options (always shown)
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const ValkeyForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
