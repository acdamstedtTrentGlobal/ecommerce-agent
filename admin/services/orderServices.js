const orderData = require('../data/orderData');

async function listOrders() {
  return await orderData.listOrders();
}

module.exports = { listOrders };
