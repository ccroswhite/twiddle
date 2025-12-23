/**
 * Group and member types for Twiddle
 */

export interface Group {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
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
    members?: Array<{ userId: string; role: string }>;
}

export interface GroupUpdateInput {
    name?: string;
    description?: string;
}
