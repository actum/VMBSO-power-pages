import React, { useState } from "react";
import { InputLabel, TextField, type TextFieldProps } from "@mui/material";

type InputLabelFieldProps = Omit<TextFieldProps, "error"> & {
  label: string;
  error?: string;
  ariaLabel?: string;
  hideHelperText?: boolean;
}

const InputLabelField: React.FC<InputLabelFieldProps> = ({
  label,
  required,
  children,
  value,
  onChange,
  onBlur,
  select,
  rows = 4,
  ariaLabel,
  fullWidth,
  error,
  multiline,
  hideHelperText,
  ...rest
}) => {

  const [touched, setTouched] = useState<boolean>(false);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {
    setTouched(true);

    onBlur?.(e);
  };

  const valueMissing = !value || (Array.isArray(value) && value[0] === "");
  const isError = touched && valueMissing && required;

  return (
    <>
      <InputLabel>
        {label}
        {required && " *"}
      </InputLabel>

      <TextField
        aria-label={ariaLabel}
        value={value || (select ? [""] : "")}
        select={select}
        fullWidth={fullWidth}
        required={required}
        onChange={onChange}
        onBlur={handleBlur}
        error={isError}
        helperText={isError ? error : !hideHelperText && " "}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        {...rest}
      >
        {children}
        </TextField>
    </>
  );
};

export default InputLabelField;
