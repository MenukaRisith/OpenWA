import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LockKeyhole, MessageSquare, RadioTower } from 'lucide-react';
import { authApi, type User } from '../services/api';
import './Login.css';

interface LoginProps {
  onLogin: (auth: { token?: string; apiKey?: string; role?: User['role']; username?: string }) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'user' | 'apiKey'>('user');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'user' && (!username.trim() || !password)) {
      setError(t('login.credentialsRequired'));
      return;
    }
    if (mode === 'apiKey' && !apiKey.trim()) {
      setError(t('login.apiKeyRequired'));
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'user') {
        const result = await authApi.login({ username, password });
        onLogin({
          token: result.token,
          role: result.user.role,
          username: result.user.username,
        });
        return;
      }

      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.valid) {
          onLogin({ apiKey, role: data.role });
        } else {
          setError(t('login.invalidKey'));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || t('login.invalidKey'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <section className="login-intro" aria-label={t('common.appName')}>
        <span className="login-eyebrow">{t('login.eyebrow')}</span>
        <h1 className="aeon-display">{t('login.title')}</h1>
        <p>{t('login.subtitle')}</p>
        <div className="login-proof-grid">
          <span><MessageSquare size={16} /> {t('login.proofSessions')}</span>
          <span><RadioTower size={16} /> {t('login.proofWebhooks')}</span>
          <span><LockKeyhole size={16} /> {t('login.proofAccess')}</span>
        </div>
      </section>
      <div className="login-card">
        <div className="login-logo">
          <span className="login-brand-mark" aria-hidden="true">AW</span>
          <strong>{t('common.appName')}</strong>
          <span className="version-info">
            {t('login.version', {
              version: __APP_VERSION__,
              date: new Date(__BUILD_TIME__).toLocaleDateString(),
            })}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-mode-switch" role="tablist" aria-label={t('login.authMode')}>
            <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>
              {t('login.userLogin')}
            </button>
            <button type="button" className={mode === 'apiKey' ? 'active' : ''} onClick={() => setMode('apiKey')}>
              {t('login.apiKeyLogin')}
            </button>
          </div>

          {mode === 'user' ? (
            <>
              <div className="input-group">
                <label htmlFor="username">{t('common.username')}</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  className={error ? 'error' : ''}
                  autoComplete="username"
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">{t('common.password')}</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type={showKey ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    className={error ? 'error' : ''}
                    autoComplete="current-password"
                  />
                  <button type="button" className="toggle-visibility" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="input-group">
              <label htmlFor="apiKey">{t('login.apiKey')}</label>
              <div className="input-wrapper">
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={t('login.apiKeyPlaceholder')}
                  className={error ? 'error' : ''}
                />
                <button type="button" className="toggle-visibility" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {error && <span className="error-message">{error}</span>}

          <button type="submit" className="connect-btn" disabled={isLoading}>
            {isLoading ? t('login.connecting') : t('login.connect')}
          </button>
        </form>
      </div>

      <footer className="login-footer">
        <span>{t('login.footer')}</span>
      </footer>
    </div>
  );
}
