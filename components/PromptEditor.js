import React from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';

export const PromptEditor = ({ originalPrompts, editedPrompts, setEditedPrompts, onSavePrompt, onDiscardPrompt, isConsultingExpert, onConsultExpert, pendingToolUpdates }) => {

  const handlePromptChange = (index, newText) => {
    setEditedPrompts({
      ...editedPrompts,
      [index]: newText,
    });
  };

  if (originalPrompts.length === 0) {
    return React.createElement(Typography, { variant: "body2", color: "text.secondary" }, "No significant string literals (prompts) found in the selected function.");
  }

  return React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 4 } },
    originalPrompts.map((prompt, index) => {
      const editedPrompt = editedPrompts[index];
      const isDirty = editedPrompt !== undefined && editedPrompt !== prompt;
      const hasPendingToolUpdate = pendingToolUpdates[index] && pendingToolUpdates[index].length > 0;

      return React.createElement(Box, { key: index },
        React.createElement(Typography, { variant: "subtitle2", gutterBottom: true, color: "text.secondary" },
          `Extracted Prompt #${index + 1}`
        ),
        React.createElement(TextField, {
          id: `prompt-editor-${index}`,
          value: editedPrompt ?? prompt,
          onChange: (e) => handlePromptChange(index, e.target.value),
          multiline: true,
          rows: 8,
          fullWidth: true,
          variant: "outlined",
          disabled: isConsultingExpert === index,
          InputProps: {
            sx: {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              borderColor: isDirty ? 'primary.main' : undefined
            }
          }
        }),
        React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mt: 1 } },
          React.createElement(Button, {
              variant: "text",
              color: "primary",
              onClick: () => onConsultExpert(index),
              disabled: isConsultingExpert !== null,
              startIcon: isConsultingExpert === index ? React.createElement(CircularProgress, { size: 16, color: "inherit" }) : React.createElement(AutoAwesomeIcon),
              "aria-label": "Consult prompt expert for feedback"
            },
            isConsultingExpert === index ? 'Consulting...' : 'Consult Expert'
          ),
          React.createElement(Box, { sx: { flexGrow: 1 } }),
          React.createElement(Button, {
              onClick: () => onDiscardPrompt(index),
              disabled: !isDirty || isConsultingExpert !== null,
              color: "inherit",
              "aria-label": "Discard changes for this prompt"
            },
            "Discard"
          ),
          React.createElement(Button, {
              variant: "contained",
              onClick: () => onSavePrompt(index),
              disabled: !isDirty || isConsultingExpert !== null,
              color: "primary",
              endIcon: hasPendingToolUpdate ? React.createElement(ScienceIcon, { fontSize: "small" }) : undefined,
              "aria-label": "Save changes for this prompt"
            },
            "Save Changes"
          )
        )
      );
    })
  );
};
