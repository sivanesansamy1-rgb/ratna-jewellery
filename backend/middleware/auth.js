const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT on every protected request and attaches the real user
// record (freshly loaded from the DB) to req.user. This is the backend
// enforcement point — no route guarded by `protect` can be reached without
// a valid, unexpired token, regardless of what the frontend hides or shows.
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account has been blocked.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
  }
};

module.exports = protect;
