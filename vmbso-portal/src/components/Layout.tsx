import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Description as DocumentsIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LanguagePicker from './common/LanguagePicker';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/profile');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={1} sx={{ boxShadow: "0px 4px 40px rgba(0, 0, 0, .1)"}}>
        <Toolbar
          sx={{
            padding: { xs: "1.4rem 2.4rem", md: "0 3.2rem" },
            minHeight: "5.3rem",
            height: { md: "9rem" },
          }}
        >
          {/* Logo/Brand */}
          <Box
            component="img"
            src="/images/logo-vmbso.svg"
            alt="VMBSO"
            sx={{
              width: { xs: "13.9rem", md: "19.7rem" },
              height: "auto",
              cursor: 'pointer',
            }}
            onClick={() => navigate('/documents')}
          />

          {/* Navigation Links */}
          <Box sx={{ ml: 4, display: 'flex', gap: 2 }}>
            <Button
              size={isMobile ? "small" : "medium"}
              color="inherit"
              startIcon={<DocumentsIcon />}
              onClick={() => navigate('/documents')}
              sx={{
                fontSize: { xs: "1rem", md: "1.6rem" },
                color: 'text.primary',
                fontWeight: 500,
                padding: { xs: "0.4rem 1.2rem", md: "0.8rem 2.4rem" },
              }}
            >
              Documents
            </Button>
          </Box>

          {/* Right side - Language and User Menu */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Language Switcher Placeholder */}
            <LanguagePicker />

            {/* User Menu */}
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              sx={{ color: 'text.primary' }}
            >
              <AccountCircleIcon fontSize={isMobile ? "medium" : "large"}/>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleProfile}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: "0.2rem",
          mt: 'auto',
          bgcolor: 'primary.main',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="white" align="center">
            © {new Date().getFullYear()} VM Building Solutions. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};
