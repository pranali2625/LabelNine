const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/email');

// @route POST /api/auth/register
// @desc  Register with email+password
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email or phone, and password' });
    }

    const existingUser = await User.findOne({
      $or: [
        email ? { email: email.toLowerCase() } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email or phone' });
    }

    const user = await User.create({ name, email: email?.toLowerCase(), phone, password });
    const token = generateToken(user._id);

    // Send OTP for email verification if email provided
    if (email) {
      const otp = user.generateOtp();
      await user.save({ validateBeforeSave: false });
      try {
        await sendOtpEmail(email, otp, name);
      } catch (e) {
        console.error('Email send failed:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/login
// @desc  Login with email/phone + password
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide identifier and password' });
    }

    const isPhone = /^[6-9]\d{9}$/.test(identifier);
    const query = isPhone ? { phone: identifier } : { email: identifier.toLowerCase() };

    const user = await User.findOne(query).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/send-otp
// @desc  Send OTP to email or phone
router.post('/send-otp', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone required' });
    }

    const query = email ? { email: email.toLowerCase() } : { phone };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = user.generateOtp();
    await user.save({ validateBeforeSave: false });

    if (email) {
      await sendOtpEmail(email, otp, user.name);
    } else {
      // Phone OTP: integrate MSG91 / Twilio here
      // For now, log in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${phone}: ${otp}`);
      }
    }

    res.json({ success: true, message: `OTP sent to ${email || phone}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/verify-otp
// @desc  Verify OTP and mark phone/email verified
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    if ((!email && !phone) || !otp) {
      return res.status(400).json({ success: false, message: 'Email/phone and OTP required' });
    }

    const query = email ? { email: email.toLowerCase() } : { phone };
    const user = await User.findOne(query).select('+otp +otpExpire');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (email) user.isEmailVerified = true;
    if (phone) user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Verification successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isPhoneVerified: user.isPhoneVerified, isEmailVerified: user.isEmailVerified }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/login-otp
// @desc  Request OTP login (passwordless via phone/email)
router.post('/login-otp', async (req, res) => {
  try {
    const { phone, email } = req.body;
    const query = phone ? { phone } : { email: email?.toLowerCase() };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found. Please register first.' });
    }

    const otp = user.generateOtp();
    await user.save({ validateBeforeSave: false });

    if (email) {
      await sendOtpEmail(email, otp, user.name);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Login OTP for ${phone}: ${otp}`);
      }
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
