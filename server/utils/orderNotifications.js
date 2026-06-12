const User = require('../models/User');
const { sendOrderConfirmationEmail } = require('./email');
const {
  sendOrderConfirmationSms,
  sendOrderStatusSms,
  sendOrderCancelledSms
} = require('./sms');
const {
  sendOrderConfirmationWhatsApp,
  sendOrderStatusWhatsApp,
  sendOrderCancelledWhatsApp
} = require('./whatsapp');

const getOrderContact = (order, user) => ({
  phone: order.shippingAddress?.phone || user?.phone,
  name: order.shippingAddress?.name || user?.name,
  email: user?.email
});

const notifyOrderConfirmed = async (order, userId) => {
  try {
    const user = userId ? await User.findById(userId) : null;
    const { phone, name, email } = getOrderContact(order, user);
    const tasks = [];

    if (email) {
      tasks.push(
        sendOrderConfirmationEmail(email, order, name).catch((err) =>
          console.error('Order email failed:', err.message)
        )
      );
    }
    if (phone && process.env.NOTIFY_WHATSAPP === 'true') {
      tasks.push(
        sendOrderConfirmationWhatsApp(phone, order, name).catch((err) =>
          console.error('Order WhatsApp failed:', err.message)
        )
      );
    }
    if (phone && process.env.NOTIFY_SMS === 'true') {
      tasks.push(
        sendOrderConfirmationSms(phone, order, name).catch((err) =>
          console.error('Order SMS failed:', err.message)
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('Order confirmation notification failed:', err.message);
  }
};

const notifyOrderStatus = async (order, status, userId) => {
  if (status === 'cancelled') {
    return notifyOrderCancelled(order, userId);
  }

  try {
    const user = userId ? await User.findById(userId) : null;
    const { phone, name } = getOrderContact(order, user);
    const tasks = [];

    if (phone && process.env.NOTIFY_WHATSAPP === 'true') {
      tasks.push(
        sendOrderStatusWhatsApp(phone, order, name, status).catch((err) =>
          console.error('Order status WhatsApp failed:', err.message)
        )
      );
    }
    if (phone && process.env.NOTIFY_SMS === 'true') {
      tasks.push(
        sendOrderStatusSms(phone, order, name, status).catch((err) =>
          console.error('Order status SMS failed:', err.message)
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('Order status notification failed:', err.message);
  }
};

const notifyOrderCancelled = async (order, userId) => {
  try {
    const user = userId ? await User.findById(userId) : null;
    const { phone, name } = getOrderContact(order, user);
    const tasks = [];

    if (phone && process.env.NOTIFY_WHATSAPP === 'true') {
      tasks.push(
        sendOrderCancelledWhatsApp(phone, order, name).catch((err) =>
          console.error('Order cancellation WhatsApp failed:', err.message)
        )
      );
    }
    if (phone && process.env.NOTIFY_SMS === 'true') {
      tasks.push(
        sendOrderCancelledSms(phone, order, name).catch((err) =>
          console.error('Order cancellation SMS failed:', err.message)
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('Order cancellation notification failed:', err.message);
  }
};

module.exports = { notifyOrderConfirmed, notifyOrderStatus, notifyOrderCancelled };
