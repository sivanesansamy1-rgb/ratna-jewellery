// Populates the database with sample categories, products and an admin
// account so the site can be demoed immediately after setup.
// Run with: npm run seed   (or "npm run seed:destroy" to wipe the data)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const categories = [
  { name: 'Rings', slug: 'rings', description: 'Engagement, cocktail and everyday rings.', image: '../images/ring.jpg' },
  { name: 'Necklaces', slug: 'necklaces', description: 'Statement and layering necklaces.', image: '../images/neckleace.webp' },
  { name: 'Earrings', slug: 'earrings', description: 'Studs, hoops and drops.', image: '../images/earings.webp' },
  { name: 'Bangles', slug: 'bangles', description: 'Traditional and contemporary bangles.', image: '../images/bangles.webp' },
  { name: 'NoseStunds', slug: 'NoseStunds', description: 'Traditional NoseStunds.', image: '../images/nose stund.avif' },
  { name: 'Chains', slug: 'chains', description: 'Gold and platinum chains.', image: '../images/chain.jpg' },
];

const buildVariants = (baseSku, basePrice, sizes, metals) => {
  const variants = [];
  metals.forEach((metal, mi) => {
    sizes.forEach((size, si) => {
      variants.push({
        sku: `${baseSku}-${metal.code}-${size}`,
        metalType: metal.label,
        size: String(size),
        price: Math.round(basePrice * metal.multiplier),
        stock: 6 + ((mi + si) % 5),
      });
    });
  });
  return variants;
};

const run = async () => {
  await connectDB();

  const destroy = process.argv.includes('--destroy');
  if (destroy) {
    await Promise.all([User.deleteMany({ role: 'admin' }), Category.deleteMany(), Product.deleteMany()]);
    console.log('Seed data removed.');
    return mongoose.connection.close();
  }

  await Promise.all([Category.deleteMany(), Product.deleteMany()]);

  const createdCategories = await Category.insertMany(categories);
  const catByName = Object.fromEntries(createdCategories.map((c) => [c.name, c]));

  const products = [
    {
      name: 'Everlyn Solitaire Gold Ring',
      sku: 'RNG-001',
      category: catByName['Rings']._id,
      description:
        'A timeless solitaire ring crafted in gold with a brilliant-cut centre stone, finished by hand for a flawless setting.',
      price: 42999,
      discountPrice: 38999,
      images: [
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800'
      ],
      metalType: '18K Gold',
      metalPurity: '18K',
      weight: 4.2,
      stoneType: 'Diamond',
      stoneWeight: 0.5,
      color: 'Yellow Gold',
      availableSizes: ['14', '16', '18'],
      variants: buildVariants('RNG-001', 42999, ['14', '16', '18'], [
        { code: '18K', label: '18K Gold', multiplier: 1 },
        { code: '22K', label: '22K Gold', multiplier: 1.18 },
      ]),
      isFeatured: true,
      isBestseller: true,
    },
    {
      name: 'Meera Temple Gold Necklace',
      sku: 'NCK-001',
      category: catByName['Necklaces']._id,
      description: 'An intricately crafted temple-style necklace inspired by South Indian goddess motifs.',
      price: 128999,
      images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800'],
      metalType: '22K Gold',
      metalPurity: '22K',
      weight: 32,
      stoneType: 'Ruby',
      color: 'Yellow Gold',
      availableSizes: ['16 inch', '18 inch'],
      variants: buildVariants('NCK-001', 128999, ['16-inch', '18-inch'], [
        { code: '22K', label: '22K Gold', multiplier: 1 },
      ]),
      isFeatured: true,
      isNewArrival: true,
    },
    {
      name: 'Aria Diamond Drop Earrings',
      sku: 'ERG-001',
      category: catByName['Earrings']._id,
      description: 'Elegant drop earrings featuring pear-cut diamonds set in white gold.',
      price: 56999,
      images: ['https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=800'],
      metalType: '18K White Gold',
      metalPurity: '18K',
      weight: 3.6,
      stoneType: 'Diamond',
      stoneWeight: 0.8,
      color: 'White Gold',
      availableSizes: ['One Size'],
      variants: buildVariants('ERG-001', 56999, ['OS'], [
        { code: 'WG', label: '18K White Gold', multiplier: 1 },
        { code: 'RG', label: '18K Rose Gold', multiplier: 1.02 },
      ]),
      isBestseller: true,
    },
    {
      name: 'Kavya Kundan NoseStunds',
      sku: 'NSD-001',
      category: catByName['NoseStunds']._id,
      description: 'A beautiful traditional kundan NoseStund with intricate detailing.',
      price: 245999,
      images: ['https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800'],
      metalType: '22K Gold',
      metalPurity: '22K',
      weight: 58,
      stoneType: 'Kundan & Pearl',
      color: 'Yellow Gold',
      availableSizes: ['One Size'],
      variants: buildVariants('BRD-001', 245999, ['OS'], [{ code: '22K', label: '22K Gold', multiplier: 1 }]),
      isFeatured: true,
    },
    {
      name: 'Zara Twisted Gold Bangle Set (Pair)',
      sku: 'BGL-001',
      category: catByName['Bangles']._id,
      description: 'A pair of twisted-design gold bangles, comfortable for daily wear.',
      price: 89999,
      images: ['https://images.unsplash.com/photo-1620656798932-b0f8615a4c56?w=800'],
      metalType: '22K Gold',
      metalPurity: '22K',
      weight: 22,
      color: 'Yellow Gold',
      availableSizes: ['2.4', '2.6', '2.8'],
      variants: buildVariants('BGL-001', 89999, ['2.4', '2.6', '2.8'], [
        { code: '22K', label: '22K Gold', multiplier: 1 },
      ]),
      isNewArrival: true,
    },
    {
      name: 'Ivaan Rope Gold Chain',
      sku: 'CHN-001',
      category: catByName['Chains']._id,
      description: 'A classic rope-link chain in high-polish gold, ideal for pendants or worn alone.',
      price: 67999,
      images: ['https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800'],
      metalType: '22K Gold',
      metalPurity: '22K',
      weight: 15,
      color: 'Yellow Gold',
      availableSizes: ['18 inch', '20 inch', '22 inch'],
      variants: buildVariants('CHN-001', 67999, ['18-inch', '20-inch', '22-inch'], [
        { code: '22K', label: '22K Gold', multiplier: 1 },
      ]),
      isBestseller: true,
    },
    {
      name: 'Noor Halo Diamond Ring',
      sku: 'RNG-002',
      category: catByName['Rings']._id,
      description: 'A halo-set diamond ring surrounded by a circle of pavé stones for extra sparkle.',
      price: 74999,
      images: ['https://images.unsplash.com/photo-1614703484302-5265c94b9d5e?w=800'],
      metalType: 'Platinum',
      metalPurity: '950',
      weight: 5.1,
      stoneType: 'Diamond',
      stoneWeight: 0.65,
      color: 'Platinum',
      availableSizes: ['12', '14', '16'],
      variants: buildVariants('RNG-002', 74999, ['12', '14', '16'], [
        { code: 'PT', label: 'Platinum', multiplier: 1 },
      ]),
      isNewArrival: true,
    },
    {
      name: 'Sana Pearl Drop Pendant Set',
      sku: 'NCK-002',
      category: catByName['Necklaces']._id,
      description: 'A delicate pendant set with a freshwater pearl drop, paired with matching earrings.',
      price: 34999,
      images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800'],
      metalType: '18K Gold',
      metalPurity: '18K',
      weight: 6.4,
      stoneType: 'Pearl',
      color: 'Yellow Gold',
      availableSizes: ['16 inch', '18 inch'],
      variants: buildVariants('NCK-002', 34999, ['16-inch', '18-inch'], [
        { code: '18K', label: '18K Gold', multiplier: 1 },
      ]),
      isFeatured: true,
    },
  ];

  products.forEach(p => {
    if (p.variants && p.variants.length > 0) {
      p.stock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    } else {
      p.stock = 0;
    }
  });

  await Product.insertMany(products);
  console.log(`Seeded ${createdCategories.length} categories and ${products.length} products.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'sivanesansamy1@gmail.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Siva@2005';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({ name: 'Store Admin', email: adminEmail, password: adminPassword, role: 'admin' });
    console.log(`Admin account created -> email: ${adminEmail} / password: ${adminPassword}`);
  } else {
    console.log('Admin account already exists, skipped.');
  }

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
