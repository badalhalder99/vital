import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            VitalApp
          </Link>

          {/* Mobile Menu Button */}
          <button
            className={`mobile-menu-button ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navigation - Desktop */}
          <nav className="nav">
            <ul className="nav-links">
              <li><Link to="/" onClick={closeMobileMenu}>Home</Link></li>
              <li><Link to="/about" onClick={closeMobileMenu}>About</Link></li>
              <li><Link to="/services" onClick={closeMobileMenu}>Services</Link></li>
              <li><Link to="/contact" onClick={closeMobileMenu}>Contact</Link></li>
            </ul>
          </nav>

          {/* Auth Buttons - Desktop */}
          <div className="auth-buttons">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="welcome-text">Hello, {user.name}</span>
                <Link to="/dashboard" className="btn btn-primary" onClick={closeMobileMenu}>Dashboard</Link>
                <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/signin" className="btn btn-secondary" onClick={closeMobileMenu}>Sign In</Link>
                <Link to="/signup" className="btn btn-primary" onClick={closeMobileMenu}>Sign Up</Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu">
            <nav className="mobile-nav">
              <ul className="mobile-nav-links">
                <li><Link to="/" onClick={closeMobileMenu}>Home</Link></li>
                <li><Link to="/about" onClick={closeMobileMenu}>About</Link></li>
                <li><Link to="/services" onClick={closeMobileMenu}>Services</Link></li>
                <li><Link to="/contact" onClick={closeMobileMenu}>Contact</Link></li>
              </ul>
            </nav>

            <div className="mobile-auth-buttons">
              {isAuthenticated ? (
                <div className="mobile-user-menu">
                  <span className="welcome-text">Hello, {user.name}</span>
                  <Link to="/dashboard" className="btn btn-primary" onClick={closeMobileMenu}>Dashboard</Link>
                  <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                </div>
              ) : (
                <>
                  <Link to="/signin" className="btn btn-secondary" onClick={closeMobileMenu}>Sign In</Link>
                  <Link to="/signup" className="btn btn-primary" onClick={closeMobileMenu}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
        )}
      </div>
    </header>
  );
};

export default Header;