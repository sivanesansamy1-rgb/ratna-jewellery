// Generates human-friendly order ids like JEW48213
const generateOrderId = () => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `JEW${random}`;
};

module.exports = generateOrderId;
