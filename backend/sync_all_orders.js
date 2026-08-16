const mongoose = require('mongoose');
const Order = require('./models/Order');
const Return = require('./models/Return');
require('dotenv').config();

async function syncAllOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Finding returns...');
    
    // Find all returns
    const returns = await Return.find().sort({ createdAt: 1 });
    let fixedCount = 0;
    
    for (const ret of returns) {
      // Find the associated order
      const order = await Order.findById(ret.order);
      if (!order) continue;
      
      let needsSave = false;
      
      // Sync orderStatus with the latest return status (since we sort by createdAt: 1, 
      // the last one processed for a given order will be the most recent one)
      if (['Returned', 'Refunded', 'Approved', 'Rejected'].includes(ret.status) || ret.status === 'Requested') {
        // Only update if it's different, OR if the return is 'Refunded'/'Returned' 
        // Note: For 'Requested', it maps to 'Return Requested' in the Order model.
        const targetStatus = ret.status === 'Requested' ? 'Return Requested' : ret.status;
        
        if (order.orderStatus !== targetStatus) {
          order.orderStatus = targetStatus;
          needsSave = true;
        }
      }
      
      if (ret.status === 'Refunded' && order.paymentStatus !== 'Refunded') {
        order.paymentStatus = 'Refunded';
        needsSave = true;
      }
      
      if (needsSave) {
        await order.save();
        console.log(`Synced Order ${order.orderId}: orderStatus=${order.orderStatus}, paymentStatus=${order.paymentStatus}`);
        fixedCount++;
      }
    }
    
    console.log(`Synchronization complete. Fixed ${fixedCount} orders.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

syncAllOrders();
