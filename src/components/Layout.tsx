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
  Link,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Description as DocumentsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguagePicker from './common/LanguagePicker';
import { useCookiesStore } from '../stores/cookiesStore';

interface LayoutProps {
  children: React.ReactNode;
}

enum ApprovalStatus {
  Pending = 182980000,
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { t } = useTranslation(['header', 'footer', 'layout']);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setDialogOpen } = useCookiesStore();

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
              {t('header:navigation.documents')}
            </Button>
          </Box>

          {/* Right side - Language and User Menu */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Language Switcher */}
            <LanguagePicker />

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
                <AccountCircleIcon fontSize={isMobile ? "medium" : "large"} />
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
              <MenuItem onClick={handleProfile}>{t('header:menu.profile')}</MenuItem>
              <MenuItem onClick={handleLogout}>{t('header:menu.logout')}</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Pending Approval Ribbon */}
      {currentUser?.actum_approvalstatus === ApprovalStatus.Pending && (
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
          <Link
            color="primary.contrastText"
            component="a"
            variant="caption"
            underline="always"
            onClick={() => setDialogOpen(prev => !prev)}
            sx={{ cursor: "pointer" }}
          >
            {t('footer:cookieSettings')}
          </Link>
        </Container>
      </Box>
    </Box>
  );
};

