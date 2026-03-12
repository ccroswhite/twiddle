/**
 * Group and member types for Twiddle
 */

export interface Group {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    externalId: string | null;
    createdAt: string;
    updatedAt: string;
    memberCount?: number;
    workflowCount?: number;
    role?: string;
}

export interface GroupMember {
    id: string;
    role: string;
    createdAt: string;
    user: {
        id: string;
        email: string;
        name?: string;
        avatarUrl?: string;
    };
}

export interface GroupCreateInput {
    name: string;
    description?: string;
    isDefault?: boolean;
    externalId?: string;
}

export interface GroupUpdateInput {
    name?: string;
    description?: string;
    isDefault?: boolean;
    externalId?: string;
}
