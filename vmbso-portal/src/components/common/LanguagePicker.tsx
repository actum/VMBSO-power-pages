import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {Language as LanguageIcon } from '@mui/icons-material';

const LanguagePicker: React.FC = () => {
  const { t, i18n } = useTranslation("updateProfile");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const languages = t("fields.language.options", { returnObjects: true }) as Record<string, string>;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (key: string) => {
    i18n.changeLanguage(key);
    handleClose();
  };
  return (
    <>
      <Typography>{t(`languages.${i18n.language}`)}</Typography>
      <IconButton onClick={handleOpen} color="inherit" sx={{ color: "text.primary" }}>
        <LanguageIcon />
      </IconButton>

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
