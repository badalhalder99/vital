const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return done(null, false, { message: 'Email not found' });
      }

      const isPasswordValid = await User.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return done(null, false, { message: 'Invalid password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3005/auth/google/callback",
    passReqToCallback: true // This allows us to access the request object
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if this is a signup request for new tenant
      const isSignupRequest = req.session?.googleSignupType === 'tenant';
      
      // First check if user exists by Google ID
      let user = await User.findByGoogleId(profile.id);
      
      if (user) {
        // Update last login and return user
        await User.updateById(user._id, { last_login: new Date() });
        return done(null, user);
      }

      // Check if user exists by email
      user = await User.findByEmail(profile.emails[0].value);
      
      if (user) {
        // Link Google account to existing user
        await User.updateById(user._id, { 
          google_id: profile.id,
          avatar: profile.photos[0]?.value,
          last_login: new Date()
        });
        const updatedUser = await User.findById(user._id);
        return done(null, updatedUser);
      }

      // Determine tenant_id and role based on signup type
      let tenant_id = 1; // Default tenant for regular Google auth
      let role = 'user'; // Default role
      let storeName = null;
      let domainName = null;

      if (isSignupRequest) {
        // For tenant signup, generate new tenant_id
        const existingTenants = await User.findAll(null, 'mongodb', { where: { role: 'tenant' } });
        tenant_id = existingTenants.length + 2; // Start from 2 for tenants
        role = 'tenant';
        
        // Generate default store and domain names from Google profile
        const firstName = profile.name?.givenName || profile.displayName.split(' ')[0] || 'Store';
        storeName = `${firstName}'s Store`;
        domainName = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}-store`;
      }

      // Create new user with Google account
      const newUser = new User({
        tenant_id,
        google_id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        role,
        storeName,
        domainName,
        status: 'active',
        email_verified: true, // Google accounts are verified
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedUser = await newUser.save('mongodb');
      const userData = {
        _id: savedUser.mongodb.insertedId,
        tenant_id: newUser.tenant_id,
        google_id: newUser.google_id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        storeName: newUser.storeName,
        domainName: newUser.domainName,
        status: newUser.status,
        email_verified: newUser.email_verified,
        created_at: newUser.created_at
      };
      
      // Clear the signup type from session
      if (req.session?.googleSignupType) {
        delete req.session.googleSignupType;
      }
      
      return done(null, userData);
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;