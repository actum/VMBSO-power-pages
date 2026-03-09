
// VMBSO Design Specifications
// Based on vmbso-design-specs.md

const baseColors = {
  white: "#ffffff",
  grey1: "#f4f4f4",
  grey2: "#e2e2e2",
  grey3: "#dad9d9",
  grey4: "#343333",
  black: "#000000",
  offWhite: "#f8f9fa",
  teal: "#0090b2",
  tealDark: "#007a95",
  tealLight: '#33a6c5',
  purple: "#311d67",
  red: "#d32f2f",
  orange: "#ed6c02",
}

// Color Palette
const colors = {
  ...baseColors,

  // Primary Colors - Based on VMBSO Brand
  primaryTeal: baseColors.teal,
  primaryTealDark: baseColors.tealDark,
  primaryTealLight: baseColors.tealLight,
  primaryWhite: baseColors.white,
  primaryOffWhite: baseColors.offWhite,

  // Secondary Colors
  zincGray: '#8b95a0',
  zincLight: '#b8c0c8',
  copperBronze: '#b87333',
  epdmBlack: '#2b2b2b',
  metalSilver: '#c0c0c0',

  // Text Colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textOnDark: '#ffffff',

  // Utility Colors
  borderColor: '#e0e0e0',
  shadowColor: 'rgba(0,0,0,0.1)',
  hoverBlue: '#3a7fa8',
  successGreen: '#4a7c59',
  error: baseColors.red,
  warning: baseColors.orange,
};

export {
  colors
};
