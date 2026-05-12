import { IconButton, Link, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import React, { useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LANGUAGE_ABBREVIATIONS: Record<string, string> = {
  'en-GB': 'EN',
  'fr-FR': 'FR',
  'be-NL': 'NL',
};

const getLangAbbreviation = (langCode: string): string =>
  LANGUAGE_ABBREVIATIONS[langCode] ?? langCode.split('-')[0].toUpperCase();

const LanguagePicker: React.FC = () => {
  const { i18n } = useTranslation("languages");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (newLangKey: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("lang", newLangKey);
    navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    handleClose();
  };

  return (
    <>
      {!isMobile ? (
        <Link component="button" variant="body2" onClick={handleOpen}>
          {getLangAbbreviation(i18n.language)}
        </Link>
      ) : (
        <IconButton onClick={handleOpen}>
          <ReactCountryFlag
            countryCode={i18n.language.split("-")[1]}
            svg
            style={{ borderRadius: "100vw", width: '1.5em', height: '1.5em' }}
          />
        </IconButton>
      )}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {Object.entries(LANGUAGE_ABBREVIATIONS).map(([key, label]) => (
          <MenuItem
            key={key}
            selected={i18n.language === key}
            onClick={() => handleChange(key)}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguagePicker;
