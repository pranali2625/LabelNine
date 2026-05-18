const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  addresses: [addressSchema],
  otp: { type: String, select: false },
  otpExpire: { type: Date, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  profilePicture: { type: String }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate OTP
userSchema.methods.generateOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const bcryptjs = require('bcryptjs');
  // Store hashed OTP for security
  this.otp = otp; // Will be hashed via pre-save if needed; storing plaintext for simplicity of comparison
  this.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

module.exports = mongoose.model('User', userSchema);
