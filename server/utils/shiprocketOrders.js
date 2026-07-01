const { pool } = require('../config/db');
const Order = require('../models/Order');
const shiprocket = require('./shiprocket');
const { notifyOrderStatus } = require('./orderNotifications');

const SR_STATUS_TO_ORDER = {
  DELIVERED: 'delivered',
  'OUT FOR DELIVERY': 'out_for_delivery',
  'PICKED UP': 'shipped',
  'IN TRANSIT': 'shipped',
  SHIPPED: 'shipped',
  'MANIFEST GENERATED': 'processing',
  'READY TO SHIP': 'processing'
};

function truthyEnv(name) {
  return ['1', 'true', 'yes'].includes(String(process.env[name] || '').toLowerCase());
}

function getOrderUserId(order) {
  return order?.user?._id || order?.user?.id || order?.user;
}

async function loadOrder(orderId, populateUser = false) {
  return Order.findOne(
    { orderId },
    populateUser ? { populate: 'user' } : undefined
  );
}

async function updateShiprocketFields(orderId, fields) {
  const sets = [];
  const vals = [];

  const columnMap = {
    shiprocketOrderId: 'shiprocket_order_id',
    shiprocketShipmentId: 'shiprocket_shipment_id',
    awb: 'shiprocket_awb',
    courier: 'shiprocket_courier',
    status: 'shiprocket_status',
    labelUrl: 'shiprocket_label_url',
    syncedAt: 'shiprocket_synced_at'
  };

  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = ?`);
      vals.push(fields[key]);
    }
  }

  if (!sets.length) return;

  vals.push(orderId);
  await pool.query(`UPDATE orders SET ${sets.join(', ')}, updated_at = NOW() WHERE order_id = ?`, vals);
}

async function applyOrderStatusFromShiprocket(order, shiprocketStatus, message, location) {
  const normalized = String(shiprocketStatus || '').toUpperCase();
  const mapped = SR_STATUS_TO_ORDER[normalized];
  if (!mapped || mapped === order.orderStatus) return order;

  const skipStatuses = ['cancelled', 'returned', 'return_requested'];
  if (skipStatuses.includes(order.orderStatus)) return order;

  order.orderStatus = mapped;
  order.trackingHistory.push({
    status: mapped,
    message: message || `Shipment update: ${shiprocketStatus}`,
    timestamp: new Date(),
    location: location || ''
  });

  if (mapped === 'delivered') {
    order.deliveredAt = new Date();
  }

  await order.save();
  notifyOrderStatus(order, mapped, order.user?._id || order.user);
  return order;
}

async function createShiprocketShipment(order) {
  if (!shiprocket.isConfigured()) {
    throw new Error(shiprocket.configError());
  }

  if (order.shiprocket?.orderId) {
    throw new Error('Order already synced to Shiprocket');
  }

  if (!['confirmed', 'processing'].includes(order.orderStatus)) {
    throw new Error('Only confirmed or processing orders can be sent to Shiprocket');
  }

  const result = await shiprocket.createAdhocOrder(order);

  await updateShiprocketFields(order.orderId, {
    shiprocketOrderId: result.order_id,
    shiprocketShipmentId: result.shipment_id,
    status: result.status || 'NEW',
    syncedAt: new Date()
  });

  order.trackingHistory.push({
    status: 'processing',
    message: 'Order sent to Shiprocket for fulfillment',
    timestamp: new Date()
  });
  if (order.orderStatus === 'confirmed') {
    order.orderStatus = 'processing';
  }
  await order.save();

  const updated = await loadOrder(order.orderId, true);
  notifyOrderStatus(updated, 'processing', getOrderUserId(updated));

  if (truthyEnv('SHIPROCKET_AUTO_ASSIGN_AWB') && result.shipment_id) {
    return assignShiprocketAwb(updated);
  }

  return updated;
}

async function assignShiprocketAwb(order, courierId) {
  const shipmentId = order.shiprocket?.shipmentId;
  if (!shipmentId) {
    throw new Error('Shiprocket shipment not found — create the shipment first');
  }
  if (order.shiprocket?.awb) {
    throw new Error('AWB already assigned for this order');
  }

  const result = await shiprocket.assignAwb(shipmentId, courierId);
  const awbCode = result.response?.data?.awb_code || result.awb_code;
  const courierName = result.response?.data?.courier_name || result.courier_name;

  await updateShiprocketFields(order.orderId, {
    awb: awbCode,
    courier: courierName,
    status: 'AWB ASSIGNED',
    syncedAt: new Date()
  });

  if (truthyEnv('SHIPROCKET_AUTO_SCHEDULE_PICKUP')) {
    await shiprocket.generatePickup(shipmentId).catch((err) => {
      console.warn('Shiprocket pickup schedule failed:', err.message);
    });
  }

  let updated = await loadOrder(order.orderId, true);
  if (updated && ['confirmed', 'processing'].includes(updated.orderStatus)) {
    updated.orderStatus = 'shipped';
    updated.trackingHistory.push({
      status: 'shipped',
      message: `Shipped — AWB ${awbCode}${courierName ? ` (${courierName})` : ''}`,
      timestamp: new Date()
    });
    await updated.save();
    notifyOrderStatus(updated, 'shipped', getOrderUserId(updated));
    updated = await loadOrder(order.orderId, true);
  }

  return updated;
}

async function getShiprocketLabel(order) {
  const shipmentId = order.shiprocket?.shipmentId;
  if (!shipmentId) {
    throw new Error('Shiprocket shipment not found');
  }

  const result = await shiprocket.generateLabel(shipmentId);
  const labelUrl = result.label_url || result.response?.label_url;
  if (labelUrl) {
    await updateShiprocketFields(order.orderId, { labelUrl, syncedAt: new Date() });
  }
  return { labelUrl, raw: result };
}

async function syncTrackingFromAwb(order) {
  const awb = order.shiprocket?.awb;
  if (!awb) throw new Error('No AWB assigned for this order');

  const result = await shiprocket.trackAwb(awb);
  const tracking = result.tracking_data || result;
  const currentStatus = tracking?.shipment_status || tracking?.current_status;

  if (currentStatus) {
    await updateShiprocketFields(order.orderId, {
      status: currentStatus,
      syncedAt: new Date()
    });
    await applyOrderStatusFromShiprocket(
      order,
      currentStatus,
      tracking?.current_status || `Tracking sync: ${currentStatus}`,
      tracking?.origin || ''
    );
  }

  return { tracking, order: await Order.findOne({ orderId: order.orderId }) };
}

async function handleShiprocketWebhook(payload) {
  const channelOrderId = payload.order_id;
  if (!channelOrderId && !payload.sr_order_id) return null;

  let order = channelOrderId ? await Order.findOne({ orderId: channelOrderId }) : null;
  if (!order && payload.sr_order_id) {
    const [rows] = await pool.query(
      'SELECT order_id FROM orders WHERE shiprocket_order_id = ?',
      [payload.sr_order_id]
    );
    if (rows[0]) order = await Order.findOne({ orderId: rows[0].order_id });
  }
  if (!order) return null;

  const shiprocketStatus = payload.current_status || payload.shipment_status;
  const awb = payload.awb;

  await updateShiprocketFields(order.orderId, {
    shiprocketOrderId: payload.sr_order_id || order.shiprocket?.orderId,
    awb: awb || order.shiprocket?.awb,
    courier: payload.courier_name || order.shiprocket?.courier,
    status: shiprocketStatus,
    syncedAt: new Date()
  });

  const latestScan = Array.isArray(payload.scans) ? payload.scans[payload.scans.length - 1] : null;
  const message = latestScan?.activity || shiprocketStatus;
  const location = latestScan?.location || '';

  await applyOrderStatusFromShiprocket(order, shiprocketStatus, message, location);
  return Order.findOne({ orderId: order.orderId });
}

async function maybeCreateShiprocketOrder(order) {
  if (!truthyEnv('SHIPROCKET_AUTO_CREATE')) return null;
  if (order.shiprocket?.orderId) return null;
  if (order.paymentInfo?.status !== 'paid') return null;

  try {
    return await createShiprocketShipment(order);
  } catch (err) {
    console.error(`Shiprocket auto-create failed for ${order.orderId}:`, err.message);
    return null;
  }
}

module.exports = {
  createShiprocketShipment,
  assignShiprocketAwb,
  getShiprocketLabel,
  syncTrackingFromAwb,
  handleShiprocketWebhook,
  maybeCreateShiprocketOrder,
  updateShiprocketFields
};
