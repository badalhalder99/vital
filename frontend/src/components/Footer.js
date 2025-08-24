import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>VitalApp</h3>
            <p>Your comprehensive user management solution with secure authentication and modern features.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>User Management</li>
              <li>Secure Authentication</li>
              <li>Google OAuth</li>
              <li>CRUD Operations</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contact Info</h4>
            <p>Email: info@vitalapp.com</p>
            <p>Phone: +1 (555) 123-4567</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 VitalApp. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;