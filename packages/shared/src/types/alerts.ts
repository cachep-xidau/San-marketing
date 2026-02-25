export type AlertTypeValue = 'BUDGET_BURN' | 'PERFORMANCE_DROP' | 'GOAL_GAP' | 'DAILY_DIGEST' | 'WEEKLY_REPORT' | 'ANOMALY';
export type NotificationChannelType = 'TELEGRAM' | 'EMAIL';

export interface AlertRuleSummary {
    id: string;
    campaignId?: string;
    campaignName?: string;
    type: AlertTypeValue;
    threshold: AlertThreshold;
    channel: NotificationChannelType;
    active: boolean;
}

export interface AlertThreshold {
    field: string;
    operator: '>' | '<' | '>=' | '<=' | '==';
    value: number;
}

export interface AlertLogEntry {
    id: string;
    message: string;
    type: AlertTypeValue;
    channelSent: NotificationChannelType;
    triggeredAt: string;
    acknowledgedBy?: string;
    decisionAction?: 'pause' | 'continue' | 'adjust' | null;
}

export const ALERT_TYPE_LABELS: Record<AlertTypeValue, string> = {
    BUDGET_BURN: 'Vượt ngân sách',
    PERFORMANCE_DROP: 'Giảm hiệu quả',
    GOAL_GAP: 'Lệch mục tiêu',
    DAILY_DIGEST: 'Báo cáo ngày',
    WEEKLY_REPORT: 'Báo cáo tuần',
    ANOMALY: 'Bất thường',
};

export const ALERT_TYPE_ICONS: Record<AlertTypeValue, string> = {
    BUDGET_BURN: '🔥',
    PERFORMANCE_DROP: '📉',
    GOAL_GAP: '🎯',
    DAILY_DIGEST: '🌅',
    WEEKLY_REPORT: '📊',
    ANOMALY: '⚠️',
};
