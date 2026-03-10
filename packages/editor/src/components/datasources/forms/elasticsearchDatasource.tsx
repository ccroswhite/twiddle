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
        { value: 'basic', label: 'Username and Password' },
        { value: 'apikey', label: 'API Key' },
      ],
    },
    // Basic auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'basic' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'basic' } },
    // API Key field
    { label: 'API Key', field: 'apiKey', type: 'password', showWhen: { field: 'role', value: 'apikey' } },
    // TLS options
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const ElasticsearchForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
