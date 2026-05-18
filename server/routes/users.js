const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpire');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email && email !== user.email) {
      user.email = email.toLowerCase();
      user.isEmailVerified = false;
    }
    if (phone && phone !== user.phone) {
      user.phone = phone;
      user.isPhoneVerified = false;
    }

    await user.save();
    res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/users/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/users/addresses
router.post('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.isDefault) {
      user.addresses.forEach(a => (a.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/users/addresses/:addressId
router.put('/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (req.body.isDefault) {
      user.addresses.forEach(a => (a.isDefault = false));
    }

    Object.assign(address, req.body);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/users/addresses/:addressId
router.delete('/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull({ _id: req.params.addressId });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
