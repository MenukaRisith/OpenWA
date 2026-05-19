import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LockKeyhole, MessageSquare, RadioTower } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLogin: (apiKey: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError(t('login.apiKeyRequired'));
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        onLogin(apiKey);
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
            {error && <span className="error-message">{error}</span>}
          </div>

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
