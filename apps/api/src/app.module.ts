import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DataSyncModule } from './modules/data-sync/data-sync.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
    imports: [
        AuthModule,
        CampaignsModule,
        DataSyncModule,
        MetricsModule,
        AlertsModule,
        ReportsModule,
        TelegramModule,
        NotificationsModule,
    ],
})
export class AppModule { }
