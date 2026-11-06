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
  useTheme,
  useMediaQuery,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  // Link,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguagePicker from './common/LanguagePicker';
import { canAccessInvoices } from '../utils/accessControl';
import { canAccessRewards } from '../utils/accessControl';
import { canAccessVouchers } from '../utils/accessControl';

interface LayoutProps {
  children: React.ReactNode;
  /** Hide the navigation links and the mobile menu (e.g. the Terms & Conditions gate). */
  hideNavigation?: boolean;
}

enum ApprovalStatus {
  Pending = 182980000,
}

export const Layout: React.FC<LayoutProps> = ({ children, hideNavigation = false }) => {
  const navigate = useNavigate();
  const { logout, currentUser, isProfileComplete } = useAuth();
  const { t } = useTranslation(['header', 'footer', 'layout']);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    handleMobileMenuClose();
  };

  const navigationItems = hideNavigation ? [] : [
    { label: t('header:navigation.home'), path: '/' },
    { label: t('header:navigation.documents'), path: '/documents' },
    { label: t('header:navigation.news'), path: '/news' },
    ...(canAccessInvoices(currentUser) 
      ? [{ label: t('header:navigation.invoices'), path: '/invoices' }] 
      : []),
    ...(canAccessRewards(currentUser) 
      ? [{ label: t('header:navigation.rewards'), path: '/rewards' }] 
      : []),
    ...(canAccessVouchers(currentUser) 
      ? [{ label: t('header:navigation.vouchers'), path: '/vouchers' }] 
      : []),
  ];

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
            onClick={() => navigate('/')}
          />

          {/* Right side - Nav + Language + User Menu */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>

            {/* Navigation links — Home | Documents | News */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0 }}>
              {navigationItems.map(item => (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    fontSize: '1.4rem',
                    color: 'primary.main',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2,
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* Pipe separator */}
            <Box
              sx={{
                display: { xs: 'none', md: hideNavigation ? 'none' : 'block' },
                width: '1px',
                height: '2rem',
                bgcolor: 'divider',
                mx: 3,
              }}
            />

            {/* Language Switcher */}
            <LanguagePicker />

            {/* User name + avatar */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', ml: 4 }}
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
                <AccountCircleIcon fontSize={isMobile ? "medium" : "large"} />
              </IconButton>
            </Box>

            {/* Mobile Menu Button */}
            <IconButton
              color="inherit"
              aria-label="open menu"
              edge="end"
              onClick={handleMobileMenuToggle}
              sx={{ 
                display: { xs: hideNavigation ? 'none' : 'flex', md: 'none' },
                color: 'text.primary',
                ml: 1,
              }}
            >
              <MenuIcon />
            </IconButton>

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
                <Box sx={{ px: 4, py: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {currentUser.fullname || `${currentUser.firstname} ${currentUser.lastname}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {currentUser.emailaddress1}
                  </Typography>
                </Box>
              )}
              <Divider />
              <MenuItem onClick={handleProfile} sx={{ fontWeight: 700 }}>{t('header:menu.profile')}</MenuItem>
              <MenuItem onClick={handleLogout} sx={{ fontWeight: 700 }}>{t('header:menu.logout')}</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
      >
        <Box sx={{ pt: 2 }}>
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleMobileNavigation(item.path)}>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '1.6rem',
                      fontWeight: 700,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Pending Approval Ribbon — only once the profile is completed */}
      {isProfileComplete && currentUser?.actum_approvalstatus === ApprovalStatus.Pending && (
        <Alert 
          severity="warning" 
          sx={{ 
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': {
              width: '100%',
              textAlign: 'center',
            },
          }}
        >
          {t('layout:pendingApprovalBanner')}
        </Alert>
      )}

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
        <Container maxWidth="xl" sx={{
          display:"flex" ,
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: "2rem",
          alignItems:"center",
        }}>
          <Typography variant="body2" color="white">
            {t('footer:copyright', { year: new Date().getFullYear() })}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

