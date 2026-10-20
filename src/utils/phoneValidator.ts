export const normalizePhone = (phone: string): string | null => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+27' + cleaned.substring(1);
    } else {
      return null;
    }
  }
  if (!/^\+\d{8,15}$/.test(cleaned)) return null;
  return cleaned;
};

export const extractCountryCode = (phone: string): string | null => {
  const match = phone.match(/^\+(\d{1,3})/);
  return match ? match[1] : null;
};
