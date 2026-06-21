const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { deliverRegistrationOtp, deliverAuthOtp } = require('../utils/otpDelivery');
const { normalizePhone, normalizeEmail, normalizeLoginIdentifier } = require('../utils/authNormalize');

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isPhoneVerified: user.isPhoneVerified,
  isEmailVerified: user.isEmailVerified
});

const findPendingUser = ({ email, phone }) => {
  if (email && phone) {
    return User.findOne(
      { $or: [{ email: email.toLowerCase() }, { phone }] },
      '+otp +otpExpire'
    );
  }
  return User.findOne(
    email ? { email: email.toLowerCase() } : { phone },
    '+otp +otpExpire'
  );
};

// @route POST /api/auth/register
// @desc  Simple registration with email/phone + password (no OTP)
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, mobile number, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const user = await User.registerSimple({
      name,
      email,
      phone,
      password
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse(user)
    });
  } catch (err) {
    console.error(err);
    const status = err.message?.includes('already exists') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// @route POST /api/auth/reset-password
// @desc  Reset password by verifying registered email + mobile (no OTP/email required)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail || !normalizedPhone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, mobile number, and new password are required'
      });
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: normalizedEmail, phone: normalizedPhone });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify your account. Make sure your email and mobile match what you used when registering.'
      });
    }

    await user._savePassword(password);
    user.otp = null;
    user.otpExpire = null;
    await user.save();
    await user.clearPasswordResetToken();

    res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// @route POST /api/auth/register/send-otp
// @desc  Create pending user in users table and send OTP
router.post('/register/send-otp', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || (!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email or phone, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const { otp } = await User.upsertPendingRegistration({
      name,
      email: email?.toLowerCase(),
      phone,
      password
    });

    const delivery = await deliverRegistrationOtp({
      phone: phone || undefined,
      email: email?.toLowerCase() || undefined,
      name,
      otp
    });

    res.json({
      success: true,
      message: `OTP sent to ${delivery.destination}`,
      verifyChannel: delivery.channel,
      destination: delivery.destination,
      destinations: delivery.destinations
    });
  } catch (err) {
    console.error(err);
    const status = err.message?.includes('already exists') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message || 'Failed to send OTP' });
  }
});

// @route POST /api/auth/register/verify
// @desc  Verify OTP and complete registration
router.post('/register/verify', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    if ((!email && !phone) || !otp) {
      return res.status(400).json({ success: false, message: 'Email/phone and OTP required' });
    }

    const user = await findPendingUser({ email, phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Registration not found. Please register again.' });
    }

    if (user.isRegistrationVerified()) {
      return res.status(400).json({ success: false, message: 'Account already verified. Please sign in.' });
    }

    if (!user.otp || user.otp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (!user.otpExpire || user.otpExpire < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please register again.' });
    }

    if (user.phone) user.isPhoneVerified = true;
    if (user.email) user.isEmailVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse(user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/register/resend-otp
// @desc  Resend registration OTP for a pending user
router.post('/register/resend-otp', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone required' });
    }

    const user = await findPendingUser({ email, phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Registration not found. Please register again.' });
    }

    if (user.isRegistrationVerified()) {
      return res.status(400).json({ success: false, message: 'Account already verified. Please sign in.' });
    }

    const otp = user.generateOtp();
    await user.save();

    const delivery = await deliverRegistrationOtp({
      phone: user.phone || undefined,
      email: user.email || undefined,
      name: user.name,
      otp
    });

    res.json({
      success: true,
      message: `OTP resent to ${delivery.destination}`,
      destination: delivery.destination,
      destinations: delivery.destinations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Failed to resend OTP' });
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

    const loginId = normalizeLoginIdentifier(identifier);
    const query = loginId.type === 'phone' ? { phone: loginId.value } : { email: loginId.value };

    const user = await User.findOne(query, '+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isRegistrationVerified()) {
      return res.status(403).json({
        success: false,
        message: 'Account setup is incomplete. Please finish registration or contact support.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: userResponse(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// @route POST /api/auth/send-otp
// @desc  Send OTP to email or phone (existing users)
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
    await user.save();

    await deliverAuthOtp({
      phone: phone ? user.phone : undefined,
      email: email ? user.email : undefined,
      name: user.name,
      otp
    });

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
    const user = await User.findOne(query, '+otp +otpExpire');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.otp || user.otp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (!user.otpExpire || user.otpExpire < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (email) user.isEmailVerified = true;
    if (phone) user.isPhoneVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Verification successful',
      token,
      user: userResponse(user)
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
    await user.save();

    await deliverAuthOtp({
      phone: phone ? user.phone : undefined,
      email: email ? user.email : undefined,
      name: user.name,
      otp
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
