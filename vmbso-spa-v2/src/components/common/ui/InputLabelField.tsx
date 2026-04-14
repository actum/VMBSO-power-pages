import React, { useState } from "react";
import { InputLabel, TextField, type TextFieldProps } from "@mui/material";

type InputLabelFieldProps = Omit<TextFieldProps, "error"> & {
  label: string;
  error?: string;
  ariaLabel?: string;
  hideHelperText?: boolean;
  disableInternalValidation?: boolean; // Disable onBlur validation when parent manages validation
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
  disableInternalValidation = false,
  ...rest
}) => {

  const [touched, setTouched] = useState<boolean>(false);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) => {
    if (!disableInternalValidation) {
      setTouched(true);
    }
    onBlur?.(e);
  };

  const valueMissing = Array.isArray(value) ? value.length === 0 : !Boolean(value);
  const internalError = !disableInternalValidation && touched && valueMissing && required;
  
  // Use external error if provided, otherwise use internal validation
  const hasError = error !== undefined ? Boolean(error) : internalError;
  const errorMessage = error || (internalError ? "This field is required" : "");

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
        error={hasError}
        helperText={hasError ? errorMessage : !hideHelperText && " "}
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
