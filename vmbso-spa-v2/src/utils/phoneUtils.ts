/**
 * Phone number utilities for E.164 format validation and formatting
 * 
 * E.164 is the international telephone numbering plan format:
 * - Starts with + (plus sign)
 * - Followed by country code (1-3 digits)
 * - Followed by subscriber number
 * - Maximum 15 digits total (excluding the +)
 * - No spaces, dashes, parentheses, or other formatting
 * 
 * Examples:
 * - +32123456789 (Belgium)
 * - +33123456789 (France)  
 * - +441234567890 (UK)
 */

/**
 * Validates if a phone number is in E.164 format
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format, false otherwise
 */
export function isValidE164(phone: string): boolean {
  if (!phone) return false;
  
  // E.164 regex: starts with +, followed by 8-15 digits total
  // Minimum 8 digits ensures country code + reasonable subscriber number
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
}

/**
 * Formats a phone number to E.164 format by removing non-digit characters
 * and ensuring it starts with +
 * @param phone - Phone number to format
 * @returns Formatted phone number in E.164 format, or empty string if invalid
 */
export function formatToE164(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // Remove any additional + signs after the first one
  cleaned = '+' + cleaned.substring(1).replace(/\+/g, '');
  
  // Ensure we have at least a country code and one digit
  if (cleaned.length < 3) return cleaned; // Allow partial input during typing
  
  // Limit to 16 characters total (+ plus 15 digits)
  if (cleaned.length > 16) {
    cleaned = cleaned.substring(0, 16);
  }
  
  return cleaned;
}

/**
 * Auto-formats phone input as user types
 * Handles common input patterns and converts to E.164
 * @param value - Current input value
 * @param previousValue - Previous input value (for handling deletions)
 * @returns Formatted value
 */
export function autoFormatPhone(value: string, previousValue: string = ''): string {
  if (!value) return '';
  
  // If user is deleting, don't auto-format
  if (value.length < previousValue.length) {
    return value;
  }
  
  return formatToE164(value);
}
