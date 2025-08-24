import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [trackingStats, setTrackingStats] = useState({ clicks: 0, visitors: 0, heatmaps: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTrackingStats(prev => ({
        clicks: prev.clicks + Math.floor(Math.random() * 5) + 1,
        visitors: prev.visitors + Math.floor(Math.random() * 3) + 1,
        heatmaps: prev.heatmaps + Math.floor(Math.random() * 2)
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: "🔥",
      title: "Advanced Heatmap Analytics",
      description: "Visualize user interactions with detailed click tracking, scroll depth analysis, and engagement patterns across your entire website."
    },
    {
      icon: "🏢",
      title: "Multi-Tenant Architecture",
      description: "Seamlessly manage multiple organizations with isolated data, custom branding, and role-based access controls for enterprise scalability."
    },
    {
      icon: "📊",
      title: "Real-Time Insights",
      description: "Get instant feedback on user behavior with live tracking, real-time dashboards, and automated reporting for data-driven decisions."
    },
    {
      icon: "🔒",
      title: "Enterprise Security",
      description: "Bank-grade security with OAuth integration, encrypted data transmission, and compliance-ready infrastructure for peace of mind."
    },
    {
      icon: "📱",
      title: "Responsive Tracking",
      description: "Track user interactions across all devices - desktop, tablet, and mobile - with unified analytics and cross-platform insights."
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Optimized performance with minimal impact on your site speed, efficient data collection, and instant visualization updates."
    }
  ];

  return (
    <div className="homepage">
      <style jsx>{`
        .homepage {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .homepage .hero-section {
          padding: 120px 0 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .homepage .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }

        .homepage .home-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          position: relative;
          z-index: 2;
        }

        .homepage .hero-content h1 {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          background: linear-gradient(45deg, #fff, #f0f8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .homepage .hero-subtitle {
          font-size: 1.3rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .homepage .stats-container {
          display: flex;
          justify-content: center;
          gap: 3rem;
          margin: 3rem 0;
          flex-wrap: wrap;
        }

        .homepage .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-width: 150px;
        }

        .homepage .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #64ffda;
          display: block;
        }

        .homepage .stat-label {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-top: 0.5rem;
        }

        .homepage .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
          flex-wrap: wrap;
        }

        .homepage .home-btn {
          padding: 15px 30px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: inline-block;
          position: relative;
          overflow: hidden;
        }

        .homepage .home-btn-primary {
          background: linear-gradient(45deg, #ff6b6b, #ee5a52);
          color: white;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        }

        .homepage .home-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
        }

        .homepage .home-btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .homepage .home-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .homepage .features-section {
          padding: 80px 0;
          background: white;
          color: #333;
        }

        .homepage .section-title {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .homepage .section-subtitle {
          text-align: center;
          font-size: 1.2rem;
          color: #7f8c8d;
          margin-bottom: 4rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .homepage .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .homepage .feature-card {
          background: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
          text-align: center;
        }

        .homepage .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .homepage .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: block;
        }

        .homepage .feature-title {
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .homepage .feature-description {
          color: #7f8c8d;
          line-height: 1.6;
        }

        .homepage .how-it-works-section {
          padding: 80px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          color: #333;
        }

        .homepage .how-it-works-title {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .homepage .how-it-works-subtitle {
          text-align: center;
          font-size: 1.2rem;
          color: #7f8c8d;
          margin-bottom: 4rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .homepage .steps-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 3rem;
          margin-top: 3rem;
        }

        .homepage .step-item {
          text-align: center;
          position: relative;
        }

        .homepage .step-number {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 auto 1.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .homepage .step-title {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .homepage .step-description {
          color: #7f8c8d;
          line-height: 1.6;
          font-size: 1rem;
        }

        .homepage .cta-section {
          padding: 80px 0;
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          text-align: center;
        }

        .homepage .cta-content h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: white;
        }

        .homepage .cta-content p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .homepage .hero-content h1 {
            font-size: 2.5rem;
          }
          
          .homepage .hero-subtitle {
            font-size: 1.1rem;
          }
          
          .homepage .stats-container {
            gap: 1.5rem;
          }
          
          .homepage .features-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .homepage .steps-container {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .homepage .hero-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .homepage .home-btn {
            width: 250px;
          }
        }

        @media (max-width: 480px) {
          .homepage .hero-section {
            padding: 80px 0 60px;
          }
          
          .homepage .home-container {
            padding: 0 15px;
          }
          
          .homepage .hero-content h1 {
            font-size: 2rem;
          }
          
          .homepage .stat-item {
            min-width: 120px;
            padding: 1rem;
          }
          
          .homepage .stat-number {
            font-size: 2rem;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="home-container">
          <div className="hero-content">
            <h1>Advanced Heatmap Analytics</h1>
            <p className="hero-subtitle">
              Transform visitor interactions into actionable insights with our powerful multi-tenant heatmap platform. 
              Track clicks, analyze user behavior, and optimize your website performance with enterprise-grade analytics.
            </p>

            <div className="stats-container">
              <div className="stat-item">
                <span className="stat-number">{trackingStats.clicks.toLocaleString()}</span>
                <div className="stat-label">Clicks Tracked</div>
              </div>
              <div className="stat-item">
                <span className="stat-number">{trackingStats.visitors.toLocaleString()}</span>
                <div className="stat-label">Active Visitors</div>
              </div>
              <div className="stat-item">
                <span className="stat-number">{trackingStats.heatmaps.toLocaleString()}</span>
                <div className="stat-label">Heatmaps Generated</div>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="hero-buttons">
                <Link to="/signup" className="home-btn home-btn-primary">Start Free Trial</Link>
                <Link to="/signin" className="home-btn home-btn-secondary">Sign In</Link>
              </div>
            ) : (
              <div className="hero-buttons">
                <Link to="/dashboard" className="home-btn home-btn-primary">Go to Dashboard</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="home-container">
          <h2 className="section-title">Why Choose VitalApp?</h2>
          <p className="section-subtitle">
            Comprehensive analytics platform designed for modern businesses who demand insights, scalability, and security.
          </p>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <span className="feature-icon">{feature.icon}</span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="home-container">
          <h2 className="how-it-works-title">How It Works</h2>
          <p className="how-it-works-subtitle">
            Get started with VitalApp in just three simple steps and begin tracking user interactions immediately.
          </p>
          
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3 className="step-title">Install & Setup</h3>
              <p className="step-description">
                Add our lightweight tracking script to your website with just one line of code. Setup takes less than 5 minutes and works with any platform.
              </p>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <h3 className="step-title">Configure Tracking</h3>
              <p className="step-description">
                Customize what you want to track - clicks, scrolls, form interactions, or page views. Set up multiple domains and user roles from your dashboard.
              </p>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <h3 className="step-title">Analyze & Optimize</h3>
              <p className="step-description">
                View beautiful heatmaps, analyze user behavior patterns, and get actionable insights to improve your website's performance and conversion rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="cta-section">
          <div className="home-container">
            <div className="cta-content">
              <h2>Ready to Unlock Your Website's Potential?</h2>
              <p>Join thousands of businesses using VitalApp to optimize their user experience and boost conversions.</p>
              <Link to="/signup" className="home-btn home-btn-primary">Get Started Today</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;