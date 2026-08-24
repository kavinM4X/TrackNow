import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/client';
import BrandLogo from '../../components/common/BrandLogo';
import styles from './Register.module.css';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data) => {
    setError('');
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        name: data.name.trim(),
        phone: data.phone.trim(),
        password: data.password,
        role: 'user'
      });
      navigate('/login', {
        replace: true,
        state: { registered: true, phone: data.phone.trim() }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <BrandLogo className={styles.brandMark} />
      <div className={styles.inner}>
        <h1 className={styles.brand}>TrackNow</h1>
        <p className={styles.tagline}>Create your farmer account</p>

        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Full name</label>
          <input
            className="field-input"
            type="text"
            placeholder="Enter your full name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}

          <label className="field-label">Phone</label>
          <input
            className="field-input"
            type="tel"
            placeholder="Enter phone number"
            {...register('phone', { required: 'Phone is required' })}
          />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}

          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            placeholder="Create a password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Min 6 characters' }
            })}
          />
          {errors.password && <p className="form-error">{errors.password.message}</p>}

          <label className="field-label">Confirm password</label>
          <input
            className="field-input"
            type="password"
            placeholder="Confirm password"
            {...register('confirmPassword', {
              required: 'Confirm password is required',
              validate: (value) => value === password || 'Passwords must match'
            })}
          />
          {errors.confirmPassword && (
            <p className="form-error">{errors.confirmPassword.message}</p>
          )}

          <p className={styles.note}>Role will be set to <strong>user</strong>.</p>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Register'}
          </button>
        </form>

        <div className={styles.loginLink}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
