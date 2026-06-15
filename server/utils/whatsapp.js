const https = require('https');
const { normalizeIndianPhone } = require('./sms');

const isWhatsAppEnabled = () =>
  process.env.NOTIFY_WHATSAPP === 'true' &&
  Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()) &&
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());

const trackUrl = (orderId) =>
  `${process.env.CLIENT_URL || 'https://labelnine.in'}/track/${orderId}`;

const postToGraph = (path, body) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN.trim()}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let chunks = '';
        res.on('data', (chunk) => {
          chunks += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: chunks ? JSON.parse(chunks) : {} });
          } catch {
            resolve({ status: res.statusCode, data: { raw: chunks } });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

const sendTemplateMessage = async (phone, templateName, bodyParams = []) => {
  const to = normalizeIndianPhone(phone);
  if (!to) {
    console.warn('[WhatsApp] Invalid phone, skipping:', phone);
    return { skipped: true };
  }

  if (!isWhatsAppEnabled()) {
    console.log(`[WhatsApp dev] To ${to} | template ${templateName || '(none)'} |`, bodyParams);
    return { dev: true };
  }

  if (!templateName) {
    console.warn('[WhatsApp] Template name missing, skipping send');
    return { skipped: true };
  }

  const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID.trim();
  const template = {
    name: templateName,
    language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' }
  };

  if (bodyParams.length) {
    template.components = [
      {
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) }))
      }
    ];
  }

  const { status, data } = await postToGraph(`/${version}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template
  });

  if (status >= 400 || data.error) {
    throw new Error(data.error?.message || `WhatsApp API error ${status}`);
  }

  return data;
};

const sendOrderConfirmationWhatsApp = async (phone, order, name) =>
  sendTemplateMessage(phone, process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMED, [
    name || 'Customer',
    order.orderId,
    String(order.totalAmount),
    trackUrl(order.orderId)
  ]);

const sendOrderStatusWhatsApp = async (phone, order, name, status) => {
  const notifyStatuses = ['processing', 'shipped', 'out_for_delivery', 'delivered'];
  if (!notifyStatuses.includes(status)) return { skipped: true };

  return sendTemplateMessage(phone, process.env.WHATSAPP_TEMPLATE_ORDER_STATUS, [
    name || 'Customer',
    order.orderId,
    status.replace(/_/g, ' '),
    trackUrl(order.orderId)
  ]);
};

const sendOrderCancelledWhatsApp = async (phone, order, name) =>
  sendTemplateMessage(phone, process.env.WHATSAPP_TEMPLATE_ORDER_CANCELLED, [
    name || 'Customer',
    order.orderId
  ]);

const sendRegistrationOtpWhatsApp = async (phone, name, otp) => {
  const templateName = process.env.WHATSAPP_TEMPLATE_REGISTRATION_OTP;
  const isAuthTemplate = process.env.WHATSAPP_OTP_TEMPLATE_STYLE !== 'utility';

  if (isAuthTemplate) {
    return sendAuthenticationOtp(phone, templateName, otp);
  }

  return sendTemplateMessage(phone, templateName, [name || 'Customer', otp]);
};

// Meta Authentication category — fixed body: "{{1}} is your verification code..."
// Use "Copy code" in WhatsApp Manager (web apps — not zero-tap / one-tap).
const sendAuthenticationOtp = async (phone, templateName, otp) => {
  const to = normalizeIndianPhone(phone);
  if (!to) {
    console.warn('[WhatsApp] Invalid phone, skipping:', phone);
    return { skipped: true };
  }

  if (!isWhatsAppEnabled()) {
    console.log(`[WhatsApp dev] Auth OTP to ${to}: ${otp}`);
    return { dev: true };
  }

  if (!templateName) {
    console.warn('[WhatsApp] Template name missing, skipping send');
    return { skipped: true };
  }

  const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID.trim();
  const code = String(otp);

  const template = {
    name: templateName,
    language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: code }]
      }
    ]
  };

  const { status, data } = await postToGraph(`/${version}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template
  });

  if (status >= 400 || data.error) {
    throw new Error(data.error?.message || `WhatsApp API error ${status}`);
  }

  return data;
};

module.exports = {
  sendOrderConfirmationWhatsApp,
  sendOrderStatusWhatsApp,
  sendOrderCancelledWhatsApp,
  sendRegistrationOtpWhatsApp
};
