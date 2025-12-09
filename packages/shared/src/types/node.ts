/**
 * Node definition types for Twiddle
 */

export type NodeParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'json'
  | 'collection'
  | 'fixedCollection'
  | 'resourceLocator'
  | 'credentials';

export interface NodeParameterOption {
  name: string;
  value: string | number | boolean;
  description?: string;
}

/**
 * Fixed collection option for grouping related parameters
 */
export interface FixedCollectionOption {
  name: string;
  displayName: string;
  values: NodeParameter[];
}

export interface NodeParameter {
  name: string;
  displayName: string;
  type: NodeParameterType;
  default?: unknown;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: NodeParameterOption[] | FixedCollectionOption[];
  displayOptions?: {
    show?: Record<string, unknown[]>;
    hide?: Record<string, unknown[]>;
  };
  typeOptions?: Record<string, unknown>;
}

export interface NodeCredentialDefinition {
  name: string;
  required?: boolean;
  displayOptions?: {
    show?: Record<string, unknown[]>;
    hide?: Record<string, unknown[]>;
  };
}

export type NodeCategory =
  | 'core'
  | 'communication'
  | 'data'
  | 'development'
  | 'finance'
  | 'infrastructure'
  | 'marketing'
  | 'productivity'
  | 'sales'
  | 'utility';

export interface NodeDefinition {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
  iconColor?: string;
  category: NodeCategory;
  version: number;
  inputs: string[];
  outputs: string[];
  parameters: NodeParameter[];
  credentials?: NodeCredentialDefinition[];
  subtitle?: string;
  documentationUrl?: string;
}

export interface NodeTypeInfo {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
  iconColor?: string;
  category: NodeCategory;
}

export interface CredentialDefinition {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: NodeParameter[];
  testRequest?: {
    url: string;
    method?: string;
  };
}
