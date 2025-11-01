
import React from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';


interface PromptEditorProps {
  originalPrompts: string[];
  editedPrompts: Record<number, string>;
  setEditedPrompts: (prompts: Record<number, string>) => void;
  onSavePrompt: (index: number) => void;
  onDiscardPrompt: (index: number) => void;
  isConsultingExpert: number | null;
  onConsultExpert: (index: number) => void;
  pendingToolUpdates: Record<number, string[]>;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ originalPrompts, editedPrompts, setEditedPrompts, onSavePrompt, onDiscardPrompt, isConsultingExpert, onConsultExpert, pendingToolUpdates }) => {

  const handlePromptChange = (index: number, newText: string) => {
    setEditedPrompts({
      ...editedPrompts,
      [index]: newText,
    });
  };

  if (originalPrompts.length === 0) {
    return <Typography variant="body2" color="text.secondary">No significant string literals (prompts) found in the selected function.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {originalPrompts.map((prompt, index) => {
        const editedPrompt = editedPrompts[index];
        const isDirty = editedPrompt !== undefined && editedPrompt !== prompt;
        const hasPendingToolUpdate = pendingToolUpdates[index] && pendingToolUpdates[index].length > 0;

        return (
          <Box key={index}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Extracted Prompt #{index + 1}
            </Typography>
            <TextField
              id={`prompt-editor-${index}`}
              value={editedPrompt ?? prompt}
              onChange={(e) => handlePromptChange(index, e.target.value)}
              multiline
              rows={8}
              fullWidth
              variant="outlined"
              disabled={isConsultingExpert === index}
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  borderColor: isDirty ? 'primary.main' : undefined
                }
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
               <Button
                variant="text"
                color="primary"
                onClick={() => onConsultExpert(index)}
                disabled={isConsultingExpert !== null}
                startIcon={isConsultingExpert === index ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                aria-label="Consult prompt expert for feedback"
              >
                {isConsultingExpert === index ? 'Consulting...' : 'Consult Expert'}
              </Button>

              <Box sx={{ flexGrow: 1 }} />

              <Button
                onClick={() => onDiscardPrompt(index)}
                disabled={!isDirty || isConsultingExpert !== null}
                color="inherit"
                aria-label="Discard changes for this prompt"
              >
                Discard
              </Button>
              <Button
                variant="contained"
                onClick={() => onSavePrompt(index)}
                disabled={!isDirty || isConsultingExpert !== null}
                color="primary"
                endIcon={hasPendingToolUpdate ? <ScienceIcon fontSize="small" /> : undefined}
                aria-label="Save changes for this prompt"
              >
                Save Changes
              </Button>
            </Box>
          </div>
        );
      })}
    </Box>
  );
};