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
          'Registration failed. Phone number may already be registered.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header Branding */}
        <div className={styles.headerSection}>
          <BrandLogo className={styles.brandLogoCenter} />
          <h1 className={styles.brandTitle}>Create Farmer Account</h1>
          <p className={styles.brandSub}>
            Register for TrackNow to schedule cocoon harvest pickups & track market rates
          </p>
        </div>

        {/* Registration Form Card */}
        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <h2 className={styles.formHeaderTitle}>📝 Farmer Registration Form</h2>

          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>👤 Full Name</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>👤</span>
              <input
                className={styles.fieldInput}
                type="text"
                placeholder="Enter your full name"
                {...register('name', { required: 'Name is required' })}
              />
            </div>
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          {/* Phone Number */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📱 Phone Number</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>📞</span>
              <input
                className={styles.fieldInput}
                type="tel"
                placeholder="Enter 10-digit phone number"
                {...register('phone', { required: 'Phone number is required' })}
              />
            </div>
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Create Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>🔑</span>
              <input
                className={styles.fieldInput}
                type="password"
                placeholder="Create a secure password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters required' }
                })}
              />
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Confirm Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>✓</span>
              <input
                className={styles.fieldInput}
                type="password"
                placeholder="Re-enter password"
                {...register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: (value) => value === password || 'Passwords do not match'
                })}
              />
            </div>
            {errors.confirmPassword && (
              <p className="form-error">{errors.confirmPassword.message}</p>
            )}
          </div>



          {error && <p className="form-error">{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Creating Farmer Account…' : '✓ Complete Registration'}
          </button>
        </form>

        {/* Footer Login Shortcut */}
        <div className={styles.footerSection}>
          <div className={styles.loginCard}>
            Already have a registered account?{' '}
            <Link to="/login" className={styles.loginLink}>
              Sign In Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
