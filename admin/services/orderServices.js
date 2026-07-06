const orderData = require('../data/orderData');

async function listOrders() {
  return await orderData.listOrders();
}

async function getCompletedOrdersByDateRange(startDate, endDate) {
  return await orderData.getCompletedOrdersByDateRange(startDate, endDate);
}

async function getCompletedOrdersByDateRangeForProduct(startDate, endDate, productId) {
  return await orderData.getCompletedOrdersByDateRangeForProduct(startDate, endDate, productId);
}

async function tabulateSales(startDate, endDate) {
  return await orderData.tabulateSales(startDate, endDate);
}

async function getLowStockProducts(threshold) {
  return await orderData.getLowStockProducts(threshold);
}

module.exports = { 
  listOrders,
  getCompletedOrdersByDateRange,
  getCompletedOrdersByDateRangeForProduct,
  tabulateSales,
  getLowStockProducts
};
