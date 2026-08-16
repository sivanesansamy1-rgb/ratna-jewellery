const asyncHandler = require('../middleware/asyncHandler');
const Category = require('../models/Category');

const slugify = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, isActive } = req.body;
  const category = await Category.create({ name, slug: slugify(name), description, image, isActive });
  res.status(201).json({ category });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ categories });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  Object.assign(category, req.body);
  if (req.body.name) category.slug = slugify(req.body.name);
  await category.save();
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  await category.deleteOne();
  res.json({ message: 'Category deleted.' });
});

module.exports = { createCategory, getCategories, updateCategory, deleteCategory };
