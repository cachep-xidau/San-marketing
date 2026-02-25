import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
    // TODO: Implement Better Auth integration
    // - Email/password login
    // - Session management (Redis)
    // - Role validation

    async login(email: string, password: string) {
        // TODO: Implement login logic
        return { message: 'Auth service ready' };
    }

    async validateSession(token: string) {
        // TODO: Validate session from Redis
        return null;
    }
}
