import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AuthSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserData } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Fetch user data with the token
      const fetchUser = async () => {
        try {
          // Temporarily set token for the API call
          localStorage.setItem('token', token);
          
          const response = await api.get('/auth/me');
          if (response.data.success) {
            const user = response.data.user;
            
            // Set user data in context (this also stores token and user in localStorage)
            setUserData(user, token);
            
            // Open dashboard in new tab
            window.open('/dashboard', '_blank');
            // Navigate back to home
            navigate('/', { replace: true });
          } else {
            console.error('Failed to get user data:', response.data.message);
            localStorage.removeItem('token');
            navigate('/signin', { replace: true });
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          localStorage.removeItem('token');
          navigate('/signin', { replace: true });
        }
      };
      
      fetchUser();
    } else {
      navigate('/signin', { replace: true });
    }
  }, [searchParams, navigate, setUserData]);

  return (
    <div className="auth-success-page">
      <div className="container">
        <div className="success-content">
          <h2>🎉 Authentication Successful!</h2>
          <p>Welcome! Redirecting you to your dashboard...</p>
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccessPage;