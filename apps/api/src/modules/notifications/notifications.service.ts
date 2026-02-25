import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    // TODO: Implement multi-channel dispatch
    // - TelegramNotifier: send via Telegram bot
    // - EmailNotifier: send via Resend
    // - Read user NotificationPreference before dispatch
    // - Fallback: Telegram fail → retry → fallback email

    async dispatch(userId: string, message: string, type: string) {
        this.logger.log(`Dispatching notification to user ${userId}`);
        // TODO: Check user prefs, route to correct channel
    }

    async sendEmail(to: string, subject: string, html: string) {
        this.logger.log(`Sending email to ${to}`);
        // TODO: Send via Resend API
    }
}
