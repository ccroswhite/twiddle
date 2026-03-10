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
        { value: 'saml', label: 'SAML SSO' },
        { value: 'oidc', label: 'OpenID Connect (OIDC)' },
      ],
    },
    // Username and Password auth fields
    { label: 'Username', field: 'username', type: 'text', showWhen: { field: 'role', value: 'basic' } },
    { label: 'Password', field: 'password', type: 'password', showWhen: { field: 'role', value: 'basic' } },
    // SAML SSO fields
    { label: 'IdP Metadata URL', field: 'idpMetadataUrl', type: 'text', showWhen: { field: 'role', value: 'saml' } },
    { label: 'SP Entity ID', field: 'spEntityId', type: 'text', showWhen: { field: 'role', value: 'saml' } },
    // OIDC fields
    { label: 'Client ID', field: 'clientId', type: 'text', showWhen: { field: 'role', value: 'oidc' } },
    { label: 'Client Secret', field: 'clientSecret', type: 'password', showWhen: { field: 'role', value: 'oidc' } },
    { label: 'Issuer URL', field: 'issuerUrl', type: 'text', showWhen: { field: 'role', value: 'oidc' } },
    // TLS options
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'Allow Self-Signed Certificates', field: 'allowSelfSigned', type: 'checkbox' },
    { label: 'Skip Hostname Verification', field: 'skipHostnameVerification', type: 'checkbox' },
];

export const OpensearchForm: React.FC<DataSourceFormProps> = (props) => {
  return <DataSourceFieldsRenderer fields={fields} {...props} />;
};
