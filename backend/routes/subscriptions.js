const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { requireTenant, subscriptionCheck } = require('../middleware/tenant');

// Get current subscription
router.get('/current', requireTenant, async (req, res) => {
  try {
    const subscription = await Subscription.findByTenantId(req.tenantId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription details'
    });
  }
});

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Subscription.getDefaultPlans();

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available plans'
    });
  }
});

// Update subscription (upgrade/downgrade)
router.put('/update', requireTenant, async (req, res) => {
  try {
    const { plan_type, billing_cycle = 'monthly' } = req.body;

    if (!plan_type) {
      return res.status(400).json({
        success: false,
        message: 'Plan type is required'
      });
    }

    const plans = Subscription.getDefaultPlans();
    const newPlan = plans[plan_type];

    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    const currentSubscription = await Subscription.findByTenantId(req.tenantId);

    if (!currentSubscription) {
      // Create new subscription
      const subscription = new Subscription({
        tenant_id: req.tenantId,
        ...newPlan,
        billing_cycle,
        current_period_end: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
      });

      const result = await subscription.save();

      return res.json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    }

    // Update existing subscription
    const subscriptionInstance = Subscription.fromDocument(currentSubscription);
    
    const updateData = {
      ...newPlan,
      billing_cycle,
      status: 'active',
      cancelled_at: null,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    };

    await subscriptionInstance.update(updateData);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { ...currentSubscription, ...updateData }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel', requireTenant, async (req, res) => {
  try {
    const { reason } = req.body;

    const currentSubscription = await Subscription.findByTenantId(req.tenantId);

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    if (currentSubscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    const subscriptionInstance = Subscription.fromDocument(currentSubscription);
    await subscriptionInstance.cancel();

    // Optionally log cancellation reason
    if (reason) {
      console.log(`Subscription cancelled for tenant ${req.tenantId}: ${reason}`);
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        valid_until: currentSubscription.current_period_end
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

// Check feature access
router.get('/features/:feature', requireTenant, async (req, res) => {
  try {
    const { feature } = req.params;
    const subscription = await Subscription.findByTenantId(req.tenantId);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          feature,
          access: false,
          reason: 'No active subscription'
        }
      });
    }

    const subscriptionInstance = Subscription.fromDocument(subscription);
    const hasAccess = subscriptionInstance.hasFeature(feature);

    res.json({
      success: true,
      data: {
        feature,
        access: hasAccess,
        plan: subscription.plan_type,
        subscription_status: subscription.status
      }
    });
  } catch (error) {
    console.error('Check feature access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check feature access'
    });
  }
});

// Get subscription usage stats
router.get('/usage', requireTenant, async (req, res) => {
  try {
    const subscription = await Subscription.findByTenantId(req.tenantId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const User = require('../models/User');
    const userCount = await User.getUsersCount(req.tenantId);

    const usage = {
      users: {
        current: userCount,
        limit: subscription.max_users,
        percentage: subscription.max_users > 0 ? Math.round((userCount / subscription.max_users) * 100) : 0
      },
      storage: {
        current: 0, // Would need to implement actual storage calculation
        limit: subscription.max_storage,
        percentage: 0
      },
      billing: {
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        days_remaining: Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    };

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Get subscription usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription usage'
    });
  }
});

// Protected route example - requires specific feature
router.get('/premium-data', requireTenant, subscriptionCheck('advanced_analytics'), async (req, res) => {
  try {
    // This is just an example of a premium feature
    const premiumData = {
      analytics: {
        revenue: '$12,456',
        conversion_rate: '3.2%',
        user_growth: '+15%'
      },
      insights: [
        'Peak usage hours: 2-4 PM',
        'Most active user segment: 25-34 years',
        'Top performing feature: Dashboard'
      ]
    };

    res.json({
      success: true,
      data: premiumData
    });
  } catch (error) {
    console.error('Premium data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get premium data'
    });
  }
});

module.exports = router;