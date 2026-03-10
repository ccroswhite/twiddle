import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Domain', field: 'domain', type: 'text' },
    { label: 'Use HTTPS', field: 'useHttps', type: 'checkbox' },
];

export const WinrmForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
