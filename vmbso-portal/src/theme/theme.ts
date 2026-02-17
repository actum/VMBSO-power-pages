import { createTheme, ThemeOptions } from '@mui/material/styles';

// VMBSO Design Specifications
// Based on vmbso-design-specs.md

// Color Palette
const colors = {
  // Primary Colors - Based on VMBSO Brand
  primaryTeal: '#0090b2',
  primaryTealDark: '#007a95',
  primaryTealLight: '#33a6c5',
  primaryWhite: '#ffffff',
  primaryOffWhite: '#f8f9fa',
  
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
};

// Typography - using Inter font family
const typography: ThemeOptions['typography'] = {
  fontFamily: [
    'Inter',
    'Roboto',
    'Open Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(','),
  
  // Font sizes based on design specs
  fontSize: 16, // base font size
  
  h1: {
    fontSize: '2.25rem', // 36px
    fontWeight: 700,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: '1.875rem', // 30px
    fontWeight: 700,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: '1.5rem', // 24px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h4: {
    fontSize: '1.25rem', // 20px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h5: {
    fontSize: '1.125rem', // 18px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h6: {
    fontSize: '1rem', // 16px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  
  body1: {
    fontSize: '1rem', // 16px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textPrimary,
  },
  body2: {
    fontSize: '0.875rem', // 14px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
  
  button: {
    fontSize: '1rem',
    fontWeight: 500,
    textTransform: 'none', // Don't uppercase buttons
  },
  
  caption: {
    fontSize: '0.75rem', // 12px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textLight,
  },
};

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primaryTeal,
      light: colors.primaryTealLight,
      dark: colors.primaryTealDark,
      contrastText: colors.textOnDark,
    },
    secondary: {
      main: colors.zincGray,
      light: colors.zincLight,
      dark: '#6b7580',
      contrastText: colors.textOnDark,
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: colors.primaryTeal,
    },
    success: {
      main: colors.successGreen,
    },
    background: {
      default: colors.primaryOffWhite,
      paper: colors.primaryWhite,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textLight,
    },
    divider: colors.borderColor,
  },
  
  typography,
  
  spacing: 4, // Base spacing unit (4px)
  
  shape: {
    borderRadius: 4,
  },
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 24px',
          fontWeight: 500,
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 2px 4px ${colors.shadowColor}`,
            backgroundColor: colors.primaryTealDark,
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
            backgroundColor: 'rgba(26, 58, 82, 0.04)',
          },
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: colors.primaryTeal,
            },
          },
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.primaryWhite,
          color: colors.textPrimary,
          boxShadow: `0 2px 4px ${colors.shadowColor}`,
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: `0 2px 8px ${colors.shadowColor}`,
          borderRadius: 8,
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: `0 2px 4px ${colors.shadowColor}`,
        },
        elevation1: {
          boxShadow: `0 2px 4px ${colors.shadowColor}`,
        },
        elevation2: {
          boxShadow: `0 4px 8px ${colors.shadowColor}`,
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

export default theme;
