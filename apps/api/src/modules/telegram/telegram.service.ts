import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);

    // TODO: Implement grammY Telegram bot
    // - /start <token> → link account
    // - /report [today|week] → quick report
    // - /compare [ch1] [ch2] → channel comparison
    // - /budget [campaign] → budget status
    // - /help → command list
    // - Callback query handler for decision buttons

    async sendMessage(chatId: string, message: string) {
        this.logger.log(`Sending Telegram message to ${chatId}`);
        // TODO: Send via grammY bot instance
    }

    async sendAlertWithActions(chatId: string, message: string, actions: string[]) {
        this.logger.log(`Sending alert with actions to ${chatId}`);
        // TODO: Send message with inline keyboard buttons
    }
}
