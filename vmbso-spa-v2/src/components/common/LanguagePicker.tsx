import { IconButton, Link, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import React, { useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LanguagePicker: React.FC = () => {
  const { t, i18n } = useTranslation("languages");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const languages = t("options", { returnObjects: true }) as Record<string, string>;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (newLangKey: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    const lang = languages[newLangKey] ? newLangKey : i18n.languages[0];


    newSearchParams.set("lang", lang);

    navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    handleClose();
  };

  return (
    <>
      {!isMobile ? (
        <Link component="button" variant="body2" onClick={handleOpen}>{t(`options.${i18n.language}`)}</Link>
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
        {Object.entries(languages).map(([key, value]) => (
          <MenuItem
            key={key}
            selected={i18n.language === key}
            onClick={() => handleChange(key)}
          >
            {value}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguagePicker;
