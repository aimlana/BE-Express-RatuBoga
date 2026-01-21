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

module.exports = {
  maskEmail
}