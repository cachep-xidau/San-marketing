'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_DASHBOARD_PATHS, type UserRole } from '@marketing-hub/shared';

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

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Đăng nhập thất bại');
                setLoading(false);
                return;
            }

            // Redirect to role-specific dashboard
            const role = data.role as UserRole;
            router.push(ROLE_DASHBOARD_PATHS[role] || '/cmo');
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
            setLoading(false);
        }
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
                        <div style={{ color: 'var(--danger)', fontSize: 'var(--font-md)', marginBottom: '0.75rem' }}>
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

            </div>
        </div>
    );
}
