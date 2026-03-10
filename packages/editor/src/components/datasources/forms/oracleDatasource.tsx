import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database/Service Name', field: 'database', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const OracleForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
