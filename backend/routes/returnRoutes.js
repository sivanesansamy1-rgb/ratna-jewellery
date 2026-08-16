const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { requestReturn, getMyReturns } = require('../controllers/returnController');

router.use(protect);
router.post('/', requestReturn);
router.get('/', getMyReturns);

module.exports = router;
