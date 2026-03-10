import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password (optional)', field: 'password', type: 'password' },
    { label: 'Private Key', field: 'privateKey', type: 'textarea' },
    { label: 'Passphrase (optional)', field: 'passphrase', type: 'password' },
];

export const SshForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
