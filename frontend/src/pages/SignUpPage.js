import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    domainName: '',
    summary: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      storeName: formData.storeName,
      domainName: formData.domainName,
      summary: formData.summary,
      role: 'tenant'
    });

    if (result.success) {
      // Redirect to appropriate dashboard based on user role
      const userRole = result.user?.role;
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'tenant') {
        navigate('/tenant');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // Add signup parameter to indicate new tenant creation intent
    window.location.href = 'http://localhost:3005/auth/google?signup=tenant';
  };

  return (
    <div className="auth-page">
      <style jsx>{`
        .auth-form {
          padding: 25px 20px;
        }
        
        .form-input {
          height: 42px !important;
          padding: 10px 12px !important;
          font-size: 14px !important;
        }
        
        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .password-input {
          padding-right: 45px !important;
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 20px;
          width: 20px;
        }
        
        .password-toggle:hover {
          opacity: 0.7;
        }
        
        .btn {
          height: 42px !important;
          font-size: 14px !important;
        }
        
        textarea.form-input {
          height: auto !important;
          min-height: 42px !important;
          resize: vertical;
        }
        
        .auth-card {
          width: 520px !important;
          max-width: 520px !important;
        }
        
        @media (max-width: 480px) {
          .auth-form {
            padding: 10px 15px;
          }
          
          .auth-card {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}
      </style>
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Sign Up</h2>
            <p className="auth-subtitle">Create your tenant account to get started.</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-input password-input"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input password-input"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="storeName">Store Name</label>
                <input
                  type="text"
                  id="storeName"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Enter your store name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="domainName">Domain Name</label>
                <input
                  type="text"
                  id="domainName"
                  name="domainName"
                  value={formData.domainName}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Enter your domain name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="summary">About You (Optional)</label>
                <textarea
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Tell us a little bit about yourself"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-full"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="btn btn-google btn-full"
            >
              <span>🔍</span>
              Sign up with Google
            </button>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/signin">Sign in here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;