'use client';

import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchSession, logout, type SessionUser } from '@/lib/auth';
import { ROLE_LABELS, COMPANIES, type Company } from '@marketing-hub/shared';
import { IconHome, IconCampaign, IconUpload, IconComparison, IconReport, IconSettingsGear, IconLogout, IconBell, IconChart, IconGoogleAds } from '@/app/components/icons';

/* ---- Company Context ---- */
interface CompanyCtx {
    selectedCompanyId: string; // 'all' | company id
    setSelectedCompanyId: (id: string) => void;
    company: Company | null; // null when 'all'
}

const CompanyContext = createContext<CompanyCtx>({
    selectedCompanyId: 'all',
    setSelectedCompanyId: () => { },
    company: null,
});

export function useCompany() { return useContext(CompanyContext); }

const NAV_ITEMS: { href: string; label: string; icon: ReactNode; roles: string[] }[] = [
    { href: '/cmo', label: 'Tổng quan', icon: <IconHome size={18} />, roles: ['CMO', 'HEAD'] },
    { href: '/manager', label: 'Chiến dịch', icon: <IconCampaign size={18} />, roles: ['CMO', 'HEAD', 'MANAGER'] },
    { href: '/staff', label: 'Nhập liệu', icon: <IconUpload size={18} />, roles: ['CMO', 'HEAD', 'MANAGER', 'STAFF'] },
    { href: '/cmo/comparison', label: 'So sánh kênh', icon: <IconComparison size={18} />, roles: ['CMO', 'HEAD', 'MANAGER'] },
    { href: '/google-ads', label: 'Google Ads', icon: <IconGoogleAds size={18} />, roles: ['CMO', 'HEAD', 'MANAGER'] },
    { href: '/cmo/reports', label: 'Báo cáo', icon: <IconReport size={18} />, roles: ['CMO', 'HEAD'] },
    { href: '/cmo/alerts', label: 'Cảnh báo', icon: <IconBell size={18} />, roles: ['CMO', 'HEAD', 'MANAGER'] },
    { href: '/settings', label: 'Cài đặt', icon: <IconSettingsGear size={18} />, roles: ['CMO', 'HEAD', 'MANAGER', 'STAFF'] },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
    CMO: '#6366F1', HEAD: '#8B5CF6', MANAGER: '#3B82F6', STAFF: '#10B981',
};

/* Hamburger / Close icon */
function MenuToggleIcon({ collapsed }: { collapsed: boolean }) {
    return (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            style={{ display: 'block' }}>
            {collapsed ? (
                <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </>
            ) : (
                <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </>
            )}
        </svg>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState('all');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        fetchSession().then(session => {
            if (!session) { router.push('/'); return; }
            setUser(session);
        });
    }, [router]);

    if (!user) return null;
    const company = COMPANIES.find(c => c.id === selectedCompanyId) || null;

    return (
        <CompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId, company }}>
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Hamburger toggle — top */}
                <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                >
                    <MenuToggleIcon collapsed={sidebarCollapsed} />
                    <span className="sidebar-toggle-label">Menu</span>
                </button>


                <nav style={{ flex: 1 }}>
                    <ul className="sidebar-nav">
                        {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map(item => (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    className={`sidebar-link ${pathname === item.href || (item.href !== '/cmo' && pathname.startsWith(item.href)) ? 'active' : ''}`}
                                    onClick={e => { e.preventDefault(); router.push(item.href); }}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    {item.icon} <span>{item.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom: User card + logout combined */}
                <div className="sidebar-user-card">
                    <div className="sidebar-user-avatar" style={{
                        background: ROLE_BADGE_COLORS[user.role] || '#6366F1',
                    }}>
                        {user.name.charAt(0)}
                    </div>
                    <div className="sidebar-user-info">
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', lineHeight: 1.2 }}>{user.name}</div>
                        <div style={{
                            fontSize: 'var(--font-xs)', color: 'white',
                            background: ROLE_BADGE_COLORS[user.role] || '#6366F1',
                            padding: '0.1rem 0.4rem', borderRadius: '999px',
                            display: 'inline-block', fontWeight: 600, marginTop: '0.15rem',
                        }}>{ROLE_LABELS[user.role]}</div>
                    </div>
                    <button
                        onClick={() => { logout(); }}
                        className="sidebar-logout-icon"
                        title="Đăng xuất"
                    >
                        <IconLogout size={16} />
                    </button>
                </div>
            </aside>

            <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed-main' : ''}`}>{children}</main>
        </CompanyContext.Provider>
    );
}

