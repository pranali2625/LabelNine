const nodemailer = require('nodemailer');
const { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } = require('./contact');

const emailFooter = `
  <div style="background: #f9f9f9; padding: 16px; text-align: center;">
    <p style="color: #888; font-size: 12px; margin: 0 0 8px;">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color: #111;">${SUPPORT_EMAIL}</a> · ${SUPPORT_PHONE_DISPLAY}</p>
    <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Label Nine. All rights reserved.</p>
  </div>
`;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html
  };
  return transporter.sendMail(mailOptions);
};

const sendOtpEmail = async (email, otp, name) => {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: auto; background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden;">
      <div style="background: #111; padding: 24px; text-align: center;">
        <h1 style="color: #fff; font-size: 24px; letter-spacing: 4px; margin: 0;">LABEL NINE</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #333; font-size: 16px;">Hi ${name || 'there'},</p>
        <p style="color: #555;">Your verification OTP is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #f5f5f5; color: #111; font-size: 36px; font-weight: bold; letter-spacing: 12px; padding: 16px 32px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 13px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
      </div>
      ${emailFooter}
    </div>
  `;
  return sendEmail({ to: email, subject: 'Label Nine — Your Verification OTP', html });
};

const sendOrderConfirmationEmail = async (email, order, name) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.size}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden;">
      <div style="background: #111; padding: 24px; text-align: center;">
        <h1 style="color: #fff; font-size: 24px; letter-spacing: 4px; margin: 0;">LABEL NINE</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #111;">Order Confirmed!</h2>
        <p style="color: #555;">Hi ${name}, your order <strong>#${order.orderId}</strong> has been placed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px;">Size</th>
              <th style="padding: 10px;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 8px;">
          <strong style="font-size: 18px;">Total: ₹${order.totalAmount}</strong>
        </div>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #555;">Estimated delivery: <strong>${new Date(order.estimatedDelivery).toDateString()}</strong></p>
        <p style="color: #555;">Track your order at <a href="${process.env.CLIENT_URL}/track/${order.orderId}" style="color: #111;">labelnine.in</a></p>
        <p style="color: #888; font-size: 13px;">Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #111;">${SUPPORT_EMAIL}</a> or ${SUPPORT_PHONE_DISPLAY}</p>
      </div>
      ${emailFooter}
    </div>
  `;
  return sendEmail({ to: email, subject: `Label Nine — Order #${order.orderId} Confirmed`, html });
};

const sendPasswordResetEmail = async (email, resetUrl, name) => {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: auto; background: #fff; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden;">
      <div style="background: #111; padding: 24px; text-align: center;">
        <h1 style="color: #fff; font-size: 24px; letter-spacing: 4px; margin: 0;">LABEL NINE</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #333; font-size: 16px;">Hi ${name || 'there'},</p>
        <p style="color: #555;">We received a request to reset your password. Click the button below to choose a new one:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px; padding: 14px 28px;">RESET PASSWORD</a>
        </div>
        <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
      </div>
      ${emailFooter}
    </div>
  `;
  return sendEmail({ to: email, subject: 'Label Nine — Reset Your Password', html });
};

module.exports = { sendEmail, sendOtpEmail, sendOrderConfirmationEmail, sendPasswordResetEmail };
