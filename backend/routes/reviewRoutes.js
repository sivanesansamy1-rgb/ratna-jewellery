const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { updateReview, deleteReview } = require('../controllers/reviewController');

router.use(protect);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

module.exports = router;
