const Tenant = require('../models/Tenant');

const tenantIdentificationMiddleware = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    const subdomain = extractSubdomain(req);
    const tenantHeader = req.headers['x-tenant-id'];

    if (subdomain && subdomain !== 'www') {
      tenant = await Tenant.findBySubdomain(subdomain);
      if (tenant) {
        tenantId = tenant.id;
      }
    } else if (tenantHeader) {
      tenantId = tenantHeader;
      tenant = await Tenant.findById(tenantId);
    }

    // Allow admin routes to bypass tenant checks
    const isAdminRoute = req.path.includes('/admin') || req.originalUrl.includes('/admin');
    const isPublic = isPublicRoute(req.path);
    
    if (!tenant && !isPublic && !isAdminRoute) {
      return res.status(400).json({
        success: false,
        message: 'Tenant not found or invalid'
      });
    }

    if (tenant && tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Tenant is ${tenant.status}`
      });
    }

    req.tenant = tenant;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error('Tenant identification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const requireTenant = (req, res, next) => {
  if (!req.tenant || !req.tenantId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant identification required'
    });
  }
  next();
};

const validateTenantAccess = (requiredStatus = 'active') => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (req.tenant.status !== requiredStatus) {
      return res.status(403).json({
        success: false,
        message: `Tenant access denied. Required status: ${requiredStatus}, current: ${req.tenant.status}`
      });
    }

    next();
  };
};

const tenantIsolation = () => {
  return async (req, res, next) => {
    // Skip isolation for admin routes
    const isAdminRoute = req.path.includes('/admin') || req.originalUrl.includes('/admin');
    if (!req.tenantId || isAdminRoute) {
      return next();
    }

    try {
      const { getMongoDb } = require('../config/database');
      req.mongoDb = getMongoDb(req.tenantId);
      next();
    } catch (error) {
      console.error('Database isolation error:', error);
      res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
  };
};

function extractSubdomain(req) {
  const host = req.get('Host');
  if (!host) return null;

  const parts = host.split('.');
  
  if (parts.length > 2) {
    return parts[0];
  }

  if (req.originalUrl && req.originalUrl.includes('/tenant/')) {
    const match = req.originalUrl.match(/\/tenant\/([^\/]+)/);
    return match ? match[1] : null;
  }

  return null;
}

function isPublicRoute(path) {
  const publicRoutes = [
    '/health',
    '/auth/register-tenant',
    '/auth/login',
    '/auth/register',
    '/auth/google',
    '/auth/google/callback',
    '/auth/me',  // Allow user profile access for authentication
    '/auth/logout',  // Allow logout
    '/auth/admin',  // Allow admin login
    '/api/tenants/create',
    '/api/tenants/list',
    '/api/users',  // Allow user API for frontend compatibility
    '/api/users/tenants',  // Allow tenant listing for frontend
    '/api/analytics',  // Allow analytics tracking for all users
    '/api/heatmap'  // Allow heatmap tracking for guest users
  ];

  return publicRoutes.some(route => path.startsWith(route));
}

const subscriptionCheck = (requiredFeature = null) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findByTenantId(req.tenantId);

      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required'
        });
      }

      if (requiredFeature && subscription.features && !subscription.features[requiredFeature]) {
        return res.status(403).json({
          success: false,
          message: `Feature '${requiredFeature}' not available in current plan`
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

const rateLimitByTenant = (windowMs = 15 * 60 * 1000, max = 100) => {
  const tenantLimits = new Map();

  return (req, res, next) => {
    if (!req.tenantId) {
      return next();
    }

    const now = Date.now();
    const tenantId = req.tenantId.toString();
    
    if (!tenantLimits.has(tenantId)) {
      tenantLimits.set(tenantId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const limit = tenantLimits.get(tenantId);
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }

    if (limit.count >= max) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        resetTime: new Date(limit.resetTime)
      });
    }

    limit.count++;
    next();
  };
};

module.exports = {
  tenantIdentificationMiddleware,
  requireTenant,
  validateTenantAccess,
  tenantIsolation,
  subscriptionCheck,
  rateLimitByTenant,
  extractSubdomain,
  isPublicRoute
};