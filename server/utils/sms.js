const https = require('https');

const getProvider = () => (process.env.SMS_PROVIDER || 'fast2sms').toLowerCase();

const normalizeIndianPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
};

const toTenDigitPhone = (phone) => {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  return normalized.startsWith('91') ? normalized.slice(2) : normalized;
};

const httpsGetJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
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
      })
      .on('error', reject);
  });

const postJson = (url, headers, body) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          ...headers,
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

const isSmsEnabled = () => {
  const provider = getProvider();
  if (provider === 'msg91') return Boolean(process.env.MSG91_AUTH_KEY?.trim());
  if (provider === 'fast2sms') return Boolean(process.env.FAST2SMS_API_KEY?.trim());
  return false;
};

const trackUrl = (orderId) =>
  `${process.env.CLIENT_URL || 'https://labelnine.in'}/track/${orderId}`;

const sendMsg91TemplateSms = async (phone, templateId, variables) => {
  const mobile = normalizeIndianPhone(phone);
  if (!mobile) {
    console.warn('[SMS] Invalid phone, skipping:', phone);
    return { skipped: true };
  }

  const { status, data } = await postJson(
    'https://control.msg91.com/api/v5/flow/',
    { authkey: process.env.MSG91_AUTH_KEY.trim() },
    {
      template_id: templateId,
      short_url: '0',
      recipients: [{ mobiles: mobile, ...variables }]
    }
  );

  if (status >= 400 || data.type === 'error') {
    throw new Error(data.message || data.type || `MSG91 error ${status}`);
  }

  return data;
};

const sendFast2Sms = async (phone, messageId, variables) => {
  const number = toTenDigitPhone(phone);
  if (!number) {
    console.warn('[SMS] Invalid phone, skipping:', phone);
    return { skipped: true };
  }

  const senderId = process.env.FAST2SMS_SENDER_ID?.trim();
  if (!senderId) {
    console.warn('[SMS] FAST2SMS_SENDER_ID missing, skipping send');
    return { skipped: true };
  }

  const params = new URLSearchParams({
    authorization: process.env.FAST2SMS_API_KEY.trim(),
    sender_id: senderId,
    message: messageId,
    variables_values: variables.join('|'),
    route: 'dlt',
    numbers: number
  });

  const { status, data } = await httpsGetJson(
    `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`
  );

  if (status >= 400 || data.return === false) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : data.message || `Fast2SMS error ${status}`
    );
  }

  return data;
};

const sendTemplateSms = async (phone, templateId, variables) => {
  const provider = getProvider();

  if (!isSmsEnabled()) {
    console.log(
      `[SMS dev] provider=${provider} To ${phone} | template ${templateId || '(none)'} |`,
      variables
    );
    return { dev: true };
  }

  if (!templateId) {
    console.warn('[SMS] Template ID missing, skipping send');
    return { skipped: true };
  }

  if (provider === 'msg91') {
    return sendMsg91TemplateSms(phone, templateId, variables);
  }

  if (provider === 'fast2sms') {
    const values = Object.keys(variables)
      .sort()
      .map((key) => variables[key]);
    return sendFast2Sms(phone, templateId, values);
  }

  console.warn(`[SMS] Unknown SMS_PROVIDER "${provider}", skipping send`);
  return { skipped: true };
};

const sendOrderConfirmationSms = async (phone, order, name) => {
  const provider = getProvider();
  const templateId =
    provider === 'msg91'
      ? process.env.MSG91_TEMPLATE_ORDER_CONFIRMED
      : process.env.FAST2SMS_TEMPLATE_ORDER_CONFIRMED;

  return sendTemplateSms(phone, templateId, {
    VAR1: name || 'Customer',
    VAR2: order.orderId,
    VAR3: String(order.totalAmount),
    VAR4: trackUrl(order.orderId)
  });
};

const sendOrderStatusSms = async (phone, order, name, status) => {
  const notifyStatuses = ['processing', 'shipped', 'out_for_delivery', 'delivered'];
  if (!notifyStatuses.includes(status)) return { skipped: true };

  const provider = getProvider();
  const templateId =
    provider === 'msg91'
      ? process.env.MSG91_TEMPLATE_ORDER_STATUS
      : process.env.FAST2SMS_TEMPLATE_ORDER_STATUS;

  return sendTemplateSms(phone, templateId, {
    VAR1: name || 'Customer',
    VAR2: order.orderId,
    VAR3: status.replace(/_/g, ' '),
    VAR4: trackUrl(order.orderId)
  });
};

const sendOrderCancelledSms = async (phone, order, name) => {
  const provider = getProvider();
  const templateId =
    provider === 'msg91'
      ? process.env.MSG91_TEMPLATE_ORDER_CANCELLED
      : process.env.FAST2SMS_TEMPLATE_ORDER_CANCELLED;

  return sendTemplateSms(phone, templateId, {
    VAR1: name || 'Customer',
    VAR2: order.orderId
  });
};

module.exports = {
  normalizeIndianPhone,
  sendOrderConfirmationSms,
  sendOrderStatusSms,
  sendOrderCancelledSms
};
