'use client';

import { useState, useEffect } from 'react';
import LoginPage from '@/components/LoginPage';
import StudioPage from '@/components/StudioPage';

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);

  // 세션 스토리지에서 토큰 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('webtoon_token');
    if (saved) setToken(saved);
  }, []);

  const handleLogin = (t: string) => {
    sessionStorage.setItem('webtoon_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('webtoon_token');
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <StudioPage token={token} onLogout={handleLogout} />;
}
