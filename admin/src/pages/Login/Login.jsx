import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);

      // Get user role from localStorage
      const userDataString = localStorage.getItem('userData');
      const userData = JSON.parse(userDataString);
      
      // Navigate based on role
      if (userData.role === 'admin') {
        navigate('/');
      } else {
        // Non-admin trying to access admin panel
        setError('Admin access required');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 2C12.95 2 4 10.95 4 22c0 8.25 5.5 15.25 13 17.5V46h12v-6.5c7.5-2.25 13-9.25 13-17.5 0-11.05-8.95-20-19-20z"
              fill="white"
            />
          </svg>
        </div>
        <h1 className="login-app-name">TrackNow Admin</h1>
        <p className="login-tagline">Your batch collection management system</p>
      </div>

      <div className="login-card">
        <div className="login-card-handle"></div>

        <h2 className="login-card-title">Welcome back</h2>
        <p className="login-card-subtitle">Sign in to your admin account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1A2E1A' }}>
              Email Address
            </label>
            <div className="login-field-wrap">
              <input
                id="email"
                type="email"
                className={`login-input ${error ? 'error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                disabled={loading}
              />
              <svg className="login-field-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2 4h16a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M18 6L10 11 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password" style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1A2E1A' }}>
              Password
            </label>
            <div className="login-field-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`login-input ${error ? 'error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M2.5 3l14 14M9.5 5.5C6.5 5 4 7.5 1 10c3 2.5 5.5 5 8.5 5s5.5-2.5 8.5-5c-3-2.5-5.5-5-8.5-5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error-msg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4v4M8 12h.008" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <div className="login-btn-spinner"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="login-footer-note">
          Admin access only. Contact system administrator for access.
        </p>
      </div>
    </div>
  );
};

export default Login;
