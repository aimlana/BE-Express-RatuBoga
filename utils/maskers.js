/**
 * Masking email
 * example: company@example.com → co*****@example.com
 */

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;

  const [name, domain] = email.split('@');
  if (name.length <= 2) return '*'.repeat(name.length) + '@' + domain;

  const visible = name.slice(0, 3);
  return visible + '***@' + domain;
}


/**
 * Masking nomor HP
 * example: 081234567890 → 0812****7890
 */
function maskPhoneNumber(phone) {
  if (!phone || phone.length < 7) return phone;

  const start = phone.slice(0, 4);
  const end = phone.slice(-3);
  return start + '****' + end;
}

module.exports = {
  maskEmail,
  maskPhoneNumber
}