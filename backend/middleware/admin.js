// Independently re-checks the admin role from the database-loaded user
// object attached by `protect`. This must run AFTER `protect` on every
// admin route. Hiding admin UI in the browser is never treated as a
// substitute for this check.
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required for this operation.' });
  }
  next();
};

module.exports = requireAdmin;
