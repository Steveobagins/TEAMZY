// Canvas: packages/platform-admin-ui/src/components/common/ConfirmationDialog.js
// --- Refined useEffect logic ---

import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Slide from '@mui/material/Slide';
import PropTypes from 'prop-types'; // Added PropTypes import

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  confirmationValue = null,
  confirmationLabel = "Type value to confirm",
}) {

  const [inputValue, setInputValue] = useState('');
  // Set initial state based on whether confirmation is needed or not
  // This is calculated only once unless confirmationValue changes, but useEffect handles the dynamic check
  const [isConfirmed, setIsConfirmed] = useState(confirmationValue === null);

  // Single useEffect to handle opening and input changes
  useEffect(() => {
    if (open) {
      // Reset input when dialog opens
      setInputValue('');

      // Determine initial confirmation state based on whether input is needed
      if (confirmationValue === null) {
        setIsConfirmed(true); // No input needed, enable button immediately
        console.log("DEBUG: ConfirmationDialog Opened - No confirmationValue needed, setting isConfirmed=true");
      } else {
        // Input IS needed, button starts disabled until input matches
        setIsConfirmed(false);
        console.log(`DEBUG: ConfirmationDialog Opened - confirmationValue required ("${confirmationValue}"), setting isConfirmed=false initially`);
      }
    } else {
         // Optional: Reset when closing, though handleClose also does this
         setInputValue('');
         setIsConfirmed(confirmationValue === null); // Reset to initial state based on prop
    }
  }, [open, confirmationValue]); // Re-run when dialog opens/closes or the required value changes

   // Effect specifically for input changes when confirmation IS required
  useEffect(() => {
      // Only run this check if confirmationValue is NOT null
      if (confirmationValue !== null) {
          const confirmedState = inputValue === confirmationValue;
          setIsConfirmed(confirmedState);
          // console.log(`DEBUG: ConfirmationDialog Input Changed - Checking input "${inputValue}" against "${confirmationValue}". isConfirmed=${confirmedState}`);
      }
  }, [inputValue, confirmationValue]); // Re-run only when input or required value changes


  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleConfirm = () => {
    if (isConfirmed) {
        onConfirm();
        onClose(); // Assuming onClose is handled by the parent / no need to call local handleClose
    } else {
        console.warn("ConfirmationDialog: handleConfirm called but isConfirmed is false.");
    }
  };

  // Use the original onClose directly, no need for extra handleClose if just resetting state
  // const handleClose = () => {
  //     setInputValue('');
  //     setIsConfirmed(confirmationValue === null); // Reset based on prop
  //     onClose();
  // }

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose} // Call parent's onClose directly
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description" sx={{ mb: confirmationValue ? 2 : 0 }}>
          {message}
        </DialogContentText>

        {confirmationValue !== null && (
          <TextField
            autoFocus
            margin="dense"
            id="confirmation-input"
            label={confirmationLabel}
            type="text"
            fullWidth
            variant="outlined"
            value={inputValue}
            onChange={handleInputChange}
            sx={{ mt: 1 }}
            helperText={`Please type "${confirmationValue}" to enable confirmation.`}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit"> {/* Call parent's onClose */}
          {cancelText}
        </Button>
        <Button
            onClick={handleConfirm}
            color={confirmColor}
            variant="contained"
            disabled={!isConfirmed}
            // autoFocus // Maybe remove autoFocus if TextField has it
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Add prop-types definition
ConfirmationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired, // Can be string or other nodes
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf(['inherit', 'primary', 'secondary', 'success', 'error', 'info', 'warning']),
  confirmationValue: PropTypes.string, // Optional: string to match for confirmation
  confirmationLabel: PropTypes.string, // Optional: label for confirmation input
};


export default ConfirmationDialog;