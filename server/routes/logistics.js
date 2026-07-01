const express = require('express');
const router = express.Router();
const { handleShiprocketWebhook } = require('../utils/shiprocketOrders');

// Shiprocket webhook — URL must not contain "shiprocket", "sr", or "kr"
// Configure in Shiprocket: Settings → API → Webhooks
// Optional header: x-api-key = SHIPROCKET_WEBHOOK_TOKEN
router.post('/tracking-webhook', async (req, res) => {
  try {
    const token = process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim();
    if (token) {
      const header = req.headers['x-api-key'];
      if (header !== token) {
        return res.status(401).json({ success: false, message: 'Invalid webhook token' });
      }
    }

    await handleShiprocketWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Shiprocket webhook error:', err.message);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
