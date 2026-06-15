const { sendOtpEmail } = require('./email');
const { sendRegistrationOtpWhatsApp } = require('./whatsapp');
const { sendRegistrationOtpSms } = require('./sms');

const maskPhone = (phone) => (phone ? `******${phone.slice(-4)}` : '');
const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length <= 2 ? local[0] : `${local[0]}***${local.slice(-1)}`;
  return `${visible}@${domain}`;
};

const deliverToPhone = async (phone, name, otp) => {
  try {
    await sendRegistrationOtpWhatsApp(phone, name, otp);
    return { channel: 'phone', method: 'whatsapp', destination: maskPhone(phone) };
  } catch (err) {
    console.error('[OTP] WhatsApp failed:', err.message);
    if (process.env.NOTIFY_SMS === 'true') {
      await sendRegistrationOtpSms(phone, name, otp);
      return { channel: 'phone', method: 'sms', destination: maskPhone(phone) };
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP dev] Registration OTP for ${phone}: ${otp}`);
      return { channel: 'phone', method: 'dev', destination: maskPhone(phone) };
    }
    throw err;
  }
};

const deliverRegistrationOtp = async ({ phone, email, name, otp }) => {
  const deliveries = [];

  if (phone) {
    try {
      deliveries.push(await deliverToPhone(phone, name, otp));
    } catch (err) {
      console.error('[OTP] Phone delivery failed:', err.message);
      if (!email) throw err;
    }
  }

  if (email) {
    await sendOtpEmail(email, otp, name);
    deliveries.push({ channel: 'email', method: 'email', destination: maskEmail(email) });
  }

  if (!deliveries.length) {
    throw new Error('Email or phone required to send OTP');
  }

  const channel = deliveries.length > 1 ? 'both' : deliveries[0].channel;

  return {
    channel,
    destinations: deliveries,
    destination: deliveries.map((d) => d.destination).join(' and ')
  };
};

const deliverAuthOtp = async ({ phone, email, name, otp }) =>
  deliverRegistrationOtp({ phone, email, name, otp });

module.exports = { deliverRegistrationOtp, deliverAuthOtp, maskPhone, maskEmail };
