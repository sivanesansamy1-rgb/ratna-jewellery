const jwt = require('jsonwebtoken');

// Signs a JWT containing the user id and role.
// Role is embedded so the backend can independently verify admin
// privileges on every request without trusting the client.
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
