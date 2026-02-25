import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        return this.authService.login(body.email, body.password);
    }

    @Get('me')
    async me() {
        // TODO: Extract user from session
        return { message: 'Auth endpoint ready' };
    }

    @Post('logout')
    async logout() {
        // TODO: Invalidate session
        return { message: 'Logged out' };
    }
}
