import { Link, Menu, MenuItem } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LanguagePicker: React.FC = () => {
  const { t, i18n } = useTranslation("languages");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
      <Link component="button" variant="body2" onClick={handleOpen}>{t(`options.${i18n.language}`)}</Link>

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
