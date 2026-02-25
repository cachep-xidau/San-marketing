'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_DASHBOARD_PATHS, type UserRole } from '@marketing-hub/shared';

// Demo users (sẽ thay bằng DB khi có PostgreSQL)
const DEMO_USERS: Record<string, { password: string; name: string; role: UserRole }> = {
    'cmo@sgroup.vn': { password: 'demo', name: 'Minh (CMO)', role: 'CMO' },
    'head@sgroup.vn': { password: 'demo', name: 'Lan (Head)', role: 'HEAD' },
    'manager@sgroup.vn': { password: 'demo', name: 'Hùng (Manager)', role: 'MANAGER' },
    'staff@sgroup.vn': { password: 'demo', name: 'Trang (Staff)', role: 'STAFF' },
};

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate auth delay
        await new Promise(r => setTimeout(r, 400));

        const user = DEMO_USERS[email.toLowerCase()];
        if (!user || user.password !== password) {
            setError('Email hoặc mật khẩu không đúng');
            setLoading(false);
            return;
        }

        // Store session in cookie
        document.cookie = `mh_session=${encodeURIComponent(JSON.stringify({
            email: email.toLowerCase(),
            name: user.name,
            role: user.role,
        }))};path=/;max-age=${60 * 60 * 24}`;

        // Redirect to role-specific dashboard
        router.push(ROLE_DASHBOARD_PATHS[user.role]);
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Marketing Hub</h1>
                <p>Đăng nhập để quản lý chiến dịch marketing</p>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="email@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                }}>
                    <strong style={{ color: 'var(--primary)' }}>Demo accounts:</strong>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.25rem' }}>
                        <div>CMO: <code>cmo@sgroup.vn</code></div>
                        <div>Manager: <code>manager@sgroup.vn</code></div>
                        <div>Staff: <code>staff@sgroup.vn</code></div>
                        <div style={{ marginTop: '0.25rem', opacity: 0.7 }}>Password: <code>demo</code></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
