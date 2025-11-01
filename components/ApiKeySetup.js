import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Link, Box } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export const ApiKeySetup = ({ open, onClose, onSave }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    onSave(key);
    setKey('');
  };

  return React.createElement(Dialog, { open: open, onClose: onClose, maxWidth: "sm", fullWidth: true },
    React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', gap: 1 } }, 
        React.createElement(VpnKeyIcon, { color: "primary" }),
        'API Key Required'
    ),
    React.createElement(DialogContent, { dividers: true },
      React.createElement(Typography, { gutterBottom: true }, 
        "To use the Gemini Function Workbench, you need to provide your own Google AI API key."
      ),
      React.createElement(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true },
        "Your key is stored securely in your browser's session storage and is only used to make calls to the Gemini API from your browser. It is never shared or stored on any server."
      ),
      React.createElement(Box, { sx: { my: 2 } },
        React.createElement(TextField, {
          autoFocus: true,
          margin: "dense",
          id: "api-key-input",
          label: "Your Google AI API Key",
          type: "password",
          fullWidth: true,
          variant: "outlined",
          value: key,
          onChange: (e) => setKey(e.target.value),
          onKeyPress: (e) => e.key === 'Enter' && handleSave()
        })
      ),
      React.createElement(Link, { 
        href: "https://aistudio.google.com/app/apikey", 
        target: "_blank", 
        rel: "noopener noreferrer" 
      }, 
        "Get your API key from Google AI Studio"
      )
    ),
    React.createElement(DialogActions, null,
      React.createElement(Button, { onClick: onClose }, "Cancel"),
      React.createElement(Button, { onClick: handleSave, variant: "contained", disabled: !key }, "Save Key")
    )
  );
};
