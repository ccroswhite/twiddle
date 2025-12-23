/**
 * Credential types for Twiddle
 */

export interface Credential {
  id: string;
  name: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CredentialCreateInput {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

export interface CredentialUpdateInput {
  name?: string;
  data?: Record<string, unknown>;
}

export interface CredentialTestResult {
  success: boolean;
  message: string;
}

export interface CredentialWithAccess {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
  } | null;
  isOwner: boolean;
}
