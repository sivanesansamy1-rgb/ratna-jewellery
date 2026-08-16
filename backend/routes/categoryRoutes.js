const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/adminCategoryController');

// Public read of active categories (used by nav/shop filters)
router.get('/', getCategories);

module.exports = router;
