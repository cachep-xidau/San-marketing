/* Pictogram-style SVG icons — minimal, geometric, 24×24 viewBox */

import React from 'react';

interface IconProps {
    size?: number;
    color?: string;
    className?: string;
}

const icon = (path: string) => {
    const Icon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
            strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
            <path d={path} />
        </svg>
    );
    Icon.displayName = 'Icon';
    return Icon;
};

// Multi-path icons
const multiIcon = (paths: string[], fills?: (string | null)[]) => {
    const Icon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
            strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
            {paths.map((d, i) => (
                <path key={i} d={d} fill={fills?.[i] || 'none'} />
            ))}
        </svg>
    );
    Icon.displayName = 'MultiIcon';
    return Icon;
};

// --- Navigation ---
export const IconHome = multiIcon([
    'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z',
    'M9 21V14h6v7',
]);

export const IconCampaign = multiIcon([
    'M4 4h16v16H4z',
    'M9 9h6M9 13h4',
], [null, null]);

export const IconUpload = multiIcon([
    'M12 15V3M12 3l4 4M12 3L8 7',
    'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
]);

export const IconComparison = multiIcon([
    'M4 20V6M10 20V10M16 20V4M22 20V8',
]);

export const IconReport = multiIcon([
    'M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z',
    'M14 2v6h6',
    'M8 13h8M8 17h5',
]);

export const IconSettings = icon(
    'M12 15a3 3 0 100-6 3 3 0 000 6z'
);

export const IconSettingsGear = multiIcon([
    'M12 15a3 3 0 100-6 3 3 0 000 6z',
    'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.73 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.73a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
]);

// --- Actions ---
export const IconPlus = icon('M12 5v14M5 12h14');

export const IconSync = multiIcon([
    'M1 4v6h6',
    'M23 20v-6h-6',
    'M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15',
]);

export const IconDownload = multiIcon([
    'M12 3v12M12 15l4-4M12 15l-4-4',
    'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
]);

export const IconLink = multiIcon([
    'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
]);

export const IconUnlink = multiIcon([
    'M18.84 12.25l1.72-1.71a5 5 0 00-7.07-7.07l-1.72 1.71',
    'M5.16 11.75l-1.72 1.71a5 5 0 007.07 7.07l1.72-1.71',
    'M8 2v3M2 8h3M16 22v-3M22 16h-3',
]);

export const IconLogout = multiIcon([
    'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4',
    'M16 17l5-5-5-5M21 12H9',
]);

export const IconClose = icon('M18 6L6 18M6 6l12 12');

// --- Status ---
export const IconCheck = icon('M20 6L9 17l-5-5');

export const IconAlertTriangle = multiIcon([
    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    'M12 9v4M12 17h0',
]);

export const IconBell = multiIcon([
    'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9',
    'M13.73 21a2 2 0 01-3.46 0',
]);

export const IconClock = multiIcon([
    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    'M12 6v6l4 2',
], [null, null]);

// --- Data ---
export const IconTrendUp = icon('M23 6l-9.5 9.5-5-5L1 18');

export const IconTrendDown = icon('M23 18l-9.5-9.5-5 5L1 6');

export const IconTarget = multiIcon([
    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    'M12 18a6 6 0 100-12 6 6 0 000 12z',
    'M12 14a2 2 0 100-4 2 2 0 000 4z',
]);

export const IconDollar = multiIcon([
    'M12 1v22',
    'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
]);

export const IconChart = multiIcon([
    'M18 20V10M12 20V4M6 20v-6',
]);

export const IconPieChart = multiIcon([
    'M21.21 15.89A10 10 0 118.11 2.8',
    'M22 12A10 10 0 0012 2v10z',
], [null, 'none']);

export const IconUsers = multiIcon([
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
    'M9 11a4 4 0 100-8 4 4 0 000 8z',
    'M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
]);

export const IconFilter = icon('M22 3H2l8 9.46V19l4 2v-8.54L22 3z');

export const IconCalendar = multiIcon([
    'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z',
    'M16 2v4M8 2v4M3 10h18',
]);

export const IconFile = multiIcon([
    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z',
    'M14 2v6h6',
]);

export const IconPlay = icon('M5 3l14 9-14 9V3z');
export const IconPause = multiIcon(['M6 4h4v16H6z', 'M14 4h4v16h-4z'], ['currentColor', 'currentColor']);
export const IconStop = icon('M6 4h12v16H6z');

// --- Channels ---
export const IconFacebook = multiIcon([
    'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
]);

export const IconMusic = multiIcon([
    'M9 18V5l12-2v13',
    'M9 18a3 3 0 11-6 0 3 3 0 016 0z',
    'M21 16a3 3 0 11-6 0 3 3 0 016 0z',
]);

export const IconMessageCircle = multiIcon([
    'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
]);

export const IconActivity = icon('M22 12h-4l-3 9L9 3l-3 9H2');

export const IconEye = multiIcon([
    'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
    'M12 15a3 3 0 100-6 3 3 0 000 6z',
]);

export const IconZap = icon('M13 2L3 14h9l-1 8 10-12h-9l1-8z');

export const IconShield = icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');

export const IconBox = multiIcon([
    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    'M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
]);

export const IconGrid = multiIcon([
    'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
]);

// Google Ads triangle
export const IconGoogleAds = ({ size = 20, className }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
        <path d="M12 3L3 19h18L12 3z" stroke="#FBBC04" strokeWidth={1.75} strokeLinejoin="round" fill="none" />
        <circle cx="12" cy="14.5" r="2" fill="#4285F4" />
    </svg>
);
