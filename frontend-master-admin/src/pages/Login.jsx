import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowRight, Smartphone, Key, Info } from 'lucide-react';
import api from '../api/client';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginWithAuthenticator } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/auth/master-admin/login', {
        userId: userId.trim(),
        authCode: authCode.trim()
      });

      if (res.data && res.data.token) {
        loginWithAuthenticator(res.data.token, res.data.user);
        navigate('/dashboard');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Login failed. Please enter the 6-Digit Daily User ID and Authenticator Code from your Master Authenticator App.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent 40%), #0B0F19',
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '1rem',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
            Master Admin Login
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Enter your 6-Digit Daily User ID & Authenticator Code
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} style={{ shrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              6-Digit Daily User ID (From Authenticator App)
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-cyan)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px' }}
                placeholder="e.g. 763412"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                maxLength={8}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dynamic Authenticator Code (Changes / 1 Min)
            </label>
            <div style={{ position: 'relative' }}>
              <Smartphone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-cyan)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}
                placeholder="e.g. RATCV"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
          >
            {isSubmitting ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                <span>VERIFY & LOGIN</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Info size={12} />
            <span>Master Authenticator 2FA Enforced • 10-Min Session</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
