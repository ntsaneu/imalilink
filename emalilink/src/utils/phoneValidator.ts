/**
 * Validates and normalizes a phone number to E.164 format.
 * E.164 format: +[country code][number], e.g., +27831234567
 */
export const normalizePhone = (phone: string): string | null => {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If no + prefix, assume it's a local number
  if (!cleaned.startsWith('+')) {
    // South African numbers: 0XXXXXXXXX → +27XXXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+27' + cleaned.substring(1);
    } else {
      return null;
    }
  }

  // Validate E.164 format: + followed by 8-15 digits
  if (!/^\+\d{8,15}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
};

export const extractCountryCode = (phone: string): string | null => {
  const match = phone.match(/^\+(\d{1,3})/);
  return match ? match[1] : null;
};