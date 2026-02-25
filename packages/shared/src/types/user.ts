export type UserRole = 'CMO' | 'HEAD' | 'MANAGER' | 'STAFF';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    telegramChatId?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: UserProfile;
    token: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
    CMO: 'CMO',
    HEAD: 'Head of Marketing',
    MANAGER: 'Marketing Manager',
    STAFF: 'Marketing Staff',
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
    CMO: '/cmo',
    HEAD: '/cmo',
    MANAGER: '/manager',
    STAFF: '/staff',
};
