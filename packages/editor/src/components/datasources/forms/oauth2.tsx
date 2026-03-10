import React from 'react';
import { DataSourceFieldsRenderer, type FieldDefinition } from '../FieldRenderer';
import type { DataSourceFormProps } from '../registry';

const fields: FieldDefinition[] = [
    { label: 'Client ID', field: 'clientId', type: 'text' },
    { label: 'Client Secret', field: 'clientSecret', type: 'password' },
    { label: 'Access Token', field: 'accessToken', type: 'password' },
    { label: 'Refresh Token', field: 'refreshToken', type: 'password' },
];

export const Oauth2Form: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
