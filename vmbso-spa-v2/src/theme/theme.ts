import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { colors } from './colors';

const baseFontFamily = [
    'Inter',
    'Roboto',
    'Open Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(',');
  const baseFontFamilyWithGrotesk = `Ulm Grotesk,${baseFontFamily}`;
  const baseFontFamilyWithRubik = `Rubik,${baseFontFamily}`;

// Typography - using Inter font family
const typography: ThemeOptions['typography'] = {
  fontFamily: baseFontFamily,

  h1: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '3.6rem', // 36px
    fontWeight: 700,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '3rem', // 30px
    fontWeight: 700,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h3: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '2.4rem', // 24px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h4: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '2rem', // 20px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h5: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '1.8rem', // 18px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },
  h6: {
    fontFamily: baseFontFamilyWithGrotesk,
    fontSize: '1.6rem', // 16px
    fontWeight: 600,
    lineHeight: 1.25,
    color: colors.textPrimary,
  },

  body1: {
    fontFamily: baseFontFamilyWithRubik,
    fontSize: '1.6rem', // 16px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textPrimary,
  },
  body2: {
    fontFamily: baseFontFamilyWithRubik,
    fontSize: '1.4rem', // 14px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },

  button: {
    fontSize: '1.6rem',
    fontWeight: 500,
    textTransform: 'none', // Don't uppercase buttons
  },

  caption: {
    fontSize: '1.2rem',
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
      main: colors.error,
    },
    warning: {
      main: colors.warning,
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

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.primaryWhite,
          color: colors.textPrimary,
          boxShadow: `0 2px 4px ${colors.shadowColor}`,
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableFocusRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 24px',
          fontWeight: 500,
          transition: 'all 0.3s ease',

          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 2px white, 0 0px 10px ${colors.teal}`,
          }
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 1px 4px ${colors.shadowColor}`,
            backgroundColor: colors.primaryTealDark,
          },
          '&:active': {
            boxShadow: 'none',
            backgroundColor: colors.tealDark,
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
            backgroundColor: 'rgba(26, 58, 82, 0.04)',
          },
        },
        text: {
          '& .MuiTypography-root': {
            color: colors.teal,
          },
          '&:hover': {
            backgroundColor: 'inherit'
          }
        },
        textSizeSmall: {
          fontSize: '1.4rem',
        },
        sizeLarge: {
          fontSize: '1.6rem',
          padding: '0.8rem 2.4rem',
          minHeight: '5.6rem',
        }
      },
    },

    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.MuiMenuItem-root:hover': {
            backgroundColor: 'rgba(0, 144, 178, 0.14)',
          }
        }
      }
    },

    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: `0 2px 8px ${colors.shadowColor}`,
          borderRadius: 8,
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

    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-error': {
            border: `1px solid ${colors.red}`,
          },
        },
        input: {
          '&.Mui-disabled': {
            background: colors.grey2,
            cursor: 'not-allowed',
          },
        }
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, sans-serif',
          display: 'block',
          marginBottom: '1rem',
          fontSize: '1.2rem',
          fontWeight: 300,
          color: colors.textPrimary,
          letterSpacing: '0.05rem',

        },
      }
    },

    MuiLink: {
      styleOverrides: {
        root: {
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        }
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '1.8rem',
          border: `1px solid ${colors.grey3}`,
          borderRadius: 0,
          backgroundColor: colors.grey1,
          '& fieldset': {
            borderColor: colors.grey3,
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(0, 144, 178, .35)',
            transition: 'box-shadow .2s ease, border .2s ease',
            border: '1px solid transparent',
          }
        },
        input: {
          padding: "1.35rem 1.6rem",
        },
        notchedOutline: {
          border: 0,
        }
      }
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

    MuiSvgIcon: {
      styleOverrides: {
        fontSizeMedium : {
          fontSize: '1.8rem',
        },
        fontSizeLarge : {
          fontSize: '2.2rem',
        }
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "1.2rem",
          backgroundColor: colors.zincGray,
          padding: "1rem"
        },
        arrow: {
          color: colors.zincGray,
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
  },
});

export default theme;
