const express = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, storeName, domainName, summary, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // For tenant registration, require store name and domain name
    if (role === 'tenant' && (!storeName || !domainName)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Store name and domain name are required for tenant registration' 
      });
    }

    // Check for existing user in main database
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    const hashedPassword = await User.hashPassword(password);

    // Generate tenant_id for tenant users (simple incremental approach)
    let tenant_id = 1; // Default for regular users
    if (role === 'tenant') {
      // In a production system, you'd want a more robust tenant ID generation
      const existingTenants = await User.findAll(null, 'mongodb', { where: { role: 'tenant' } });
      tenant_id = existingTenants.length + 2; // Start from 2 for tenants
    }

    const newUser = new User({
      tenant_id,
      name,
      email,
      password: hashedPassword,
      storeName: storeName || null,
      domainName: domainName || null,
      summary: summary || null,
      role: role || 'user',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Save to main database for authentication (MongoDB only)
    const savedUser = await newUser.save('mongodb');
    const userId = savedUser.mongodb.insertedId;
    
    const token = generateToken(userId);

    // Prepare user response without password
    const userResponse = {
      _id: userId,
      tenant_id: newUser.tenant_id,
      name: newUser.name,
      email: newUser.email,
      storeName: newUser.storeName,
      domainName: newUser.domainName,
      summary: newUser.summary,
      role: newUser.role,
      status: newUser.status,
      created_at: newUser.created_at
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Login user
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Invalid credentials' 
      });
    }

    const token = generateToken(user._id);
    const userResponse = { ...user };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  })(req, res, next);
});

// Google OAuth login
router.get('/google', (req, res, next) => {
  // Store signup parameter in session if present
  if (req.query.signup) {
    req.session.googleSignupType = req.query.signup;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const userId = req.user._id || req.user.id;
    const token = generateToken(userId);
    
    // Prepare user data for frontend
    const userData = {
      _id: userId,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role || 'user',
      tenant_id: req.user.tenant_id || 1
    };
    
    // Encode user data for URL
    const encodedUser = encodeURIComponent(JSON.stringify(userData));
    
    // Redirect to frontend with token and user data
    res.redirect(`http://localhost:3000/auth/success?token=${token}&user=${encodedUser}`);
  }
);

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const userResponse = { ...req.user };
  delete userResponse.password;
  
  res.json({
    success: true,
    user: userResponse
  });
});

// Admin login - bypasses tenant restrictions
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user in main database without tenant restriction
    const user = await User.findByEmail(email);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }
    
    // Verify password
    const isValidPassword = await User.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Update last login
    await User.updateById(user._id, { last_login: new Date() });
    
    // Prepare user response without password
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Admin login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

module.exports = router;