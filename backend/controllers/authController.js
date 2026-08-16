const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

const sendEmail = require('../utils/sendEmail');
const sendWhatsApp = require('../utils/sendWhatsApp');

// @route POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (!existing.isVerified) {
      await User.findByIdAndDelete(existing._id);
    } else {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
  }

  if (!phone) {
    return res.status(400).json({ message: 'Mobile number is required for verification.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  // Password hashing happens automatically in the User model's pre-save hook.
  const user = await User.create({ 
    name, 
    email, 
    password, 
    phone, 
    otp, 
    otpExpire, 
    isVerified: false 
  });

  // Send real email with OTP using Ethereal/SMTP
  try {
    await sendEmail({
      email: user.email,
      subject: 'RATNA - Your Account Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px;">
          <h2 style="text-align: center; color: #1a1a1a;">RATNA.</h2>
          <p>Hello ${user.name.split(' ')[0]},</p>
          <p>Thank you for creating an account. Please use the following 6-digit verification code to activate your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #16423C;">${otp}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

  } catch (error) {
    console.error('Verification message could not be sent', error);
    await user.deleteOne();
    return res.status(500).json({ message: 'Verification messages could not be sent. Please try again later.' });
  }

  res.status(201).json({
    message: 'Verification OTP sent to your email.',
    userId: user._id,
  });
});

// @route POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.status(400).json({ message: 'User ID and Email OTP are required.' });
  }

  const user = await User.findById(userId).select('+otp +otpExpire');
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: 'User is already verified.' });
  }

  if (user.otp !== otp || user.otpExpire < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired Email OTP.' });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpire = undefined;
  await user.save();

  res.json({
    message: 'Account verified successfully.',
    user,
    token: generateToken(user._id, user.role),
  });
});

// @route POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    return res.status(401).json({ message: 'Create an account before login.' });
  }
  
  if (!(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (user.isBlocked) {
    return res.status(403).json({ message: 'This account has been blocked. Contact support.' });
  }
  if (!user.isVerified) {
    return res.status(401).json({ message: 'Create an account before login.' });
  }

  res.json({
    user,
    token: generateToken(user._id, user.role),
  });
});

// @route POST /api/auth/admin-login
// Separate endpoint so the admin login page never shares a form/route with
// the customer login, and so we can reject non-admin credentials outright.
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'This account does not have admin access.' });
  }

  res.json({
    user,
    token: generateToken(user._id, user.role),
  });
});

// @route GET /api/auth/temp-otp
// Temporary endpoint to bypass email issues during testing
const getTempOtp = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otp');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isVerified) return res.json({ message: 'User is already verified' });
  
  // Generate a fresh OTP right now to be absolutely sure
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = newOtp;
  user.otpExpire = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  
  res.json({ message: 'Here is your FRESH OTP code (testing only)', otp: user.otp });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// @route PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  await user.save();
  res.json({ user });
});

// @route PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully.' });
});

// --- Address book ---

// @route POST /api/auth/addresses
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ addresses: user.addresses });
});

// @route PUT /api/auth/addresses/:addressId
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: 'Address not found.' });

  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  Object.assign(address, req.body);
  await user.save();
  res.json({ addresses: user.addresses });
});

// @route DELETE /api/auth/addresses/:addressId
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.pull(req.params.addressId);
  await user.save();
  res.json({ addresses: user.addresses });
});

// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  
  // Even if user isn't found, we return 200 to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save({ validateBeforeSave: false });

  // Wait, req.get('origin') would be the frontend origin. Let's build the reset URL.
  // We assume frontend is running on localhost:5500 for dev, or the origin header if present.
  const origin = req.get('origin') || 'http://localhost:5500';
  const resetUrl = `${origin}/user/reset-password.html?token=${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'RATNA - Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px;">
          <h2 style="text-align: center; color: #1a1a1a;">RATNA.</h2>
          <p>Hello ${user.name.split(' ')[0]},</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #16423C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link is valid for 15 minutes.</p>
        </div>
      `,
    });
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Email could not be sent', error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({ message: 'Email could not be sent.' });
  }
});

// @route PUT /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token.' });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({
    message: 'Password reset successfully.',
    user,
    token: generateToken(user._id, user.role),
  });
});

module.exports = {
  registerUser,
  verifyOtp,
  loginUser,
  adminLogin,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  forgotPassword,
  resetPassword,
  getTempOtp,
};
