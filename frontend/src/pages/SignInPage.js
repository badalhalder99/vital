import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignInPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
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
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
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
    window.location.href = 'http://localhost:3005/auth/google';
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
        
        .auth-card {
          width: 480px !important;
          max-width: 480px !important;
        }
        
        @media (max-width: 768px) {
          .auth-form {
            padding: 10px 15px;
          }
          
          .auth-card {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Sign In</h2>
            <p className="auth-subtitle">Welcome back! Please sign in to your account.</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit} className="auth-form">
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
              
              <button 
                type="submit" 
                disabled={loading} 
                className="btn btn-primary btn-full"
              >
                {loading ? 'Signing In...' : 'Sign In'}
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
              Sign in with Google
            </button>
            
            <div className="auth-footer">
              <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;