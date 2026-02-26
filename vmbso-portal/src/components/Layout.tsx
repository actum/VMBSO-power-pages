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
  Divider,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Description as DocumentsIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/update-profile');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ px: 3 }}>
          {/* Logo/Brand */}
          <Box
            component="img"
            src="/images/logo-vmbso.svg"
            alt="VMBSO"
            sx={{
              height: 40,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/documents')}
          />

          {/* Navigation Links */}
          <Box sx={{ ml: 4, display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              startIcon={<DocumentsIcon />}
              onClick={() => navigate('/documents')}
              sx={{ color: 'text.primary', fontWeight: 500 }}
            >
              Documents
            </Button>
          </Box>

          {/* Right side - Language and User Menu */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Language Switcher Placeholder */}
            <IconButton color="inherit" sx={{ color: 'text.primary' }}>
              <LanguageIcon />
            </IconButton>

            {/* User name + avatar */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={handleUserMenuOpen}
            >
              {currentUser && (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {currentUser.fullname || `${currentUser.firstname} ${currentUser.lastname}`}
                </Typography>
              )}
              <IconButton
                color="inherit"
                sx={{ color: 'text.primary' }}
                aria-label="user menu"
              >
                <AccountCircleIcon />
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { minWidth: 200 } } }}
            >
              {/* User info header */}
              {currentUser && (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {currentUser.fullname || `${currentUser.firstname} ${currentUser.lastname}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {currentUser.emailaddress1}
                  </Typography>
                </Box>
              )}
              <Divider />
              <MenuItem onClick={handleProfile}>Mon profil</MenuItem>
              <MenuItem onClick={handleLogout}>Se déconnecter</MenuItem>
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
          px: 2,
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

