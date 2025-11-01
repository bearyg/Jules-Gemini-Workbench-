
import React, { useState, useEffect } from 'react';
import { PromptEditor } from './PromptEditor';

// FIX: Import 'Grid' component from '@mui/material'
import { Box, Paper, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, TextField, CircularProgress, Typography, Switch, FormControlLabel, Grid } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import ArticleIcon from '@mui/icons-material/Article';

interface FunctionRunnerProps {
  isLoading: boolean;
  onExecute: () => void;
  availableFunctions: string[];
  selectedFunction: string;
  setSelectedFunction: (fn: string) => void;
  isGeneratingArgs: boolean;
  onScaffoldArgs: () => void;
  functionArgs: string;
  setFunctionArgs: (args: string) => void;
  inputFile: File | null;
  setInputFile: (file: File | null) => void;
  hasFileLoaded: boolean;
  timeoutDuration: number;
  setTimeoutDuration: (duration: number) => void;
  isDebugMode: boolean;
  setIsDebugMode: (enabled: boolean) => void;
  originalCode: string | null;
  patchedCode: string | null;
  originalPrompts: string[];
  editedPrompts: Record<number, string>;
  setEditedPrompts: (prompts: Record<number, string>) => void;
  onSavePrompt: (index: number) => void;
  onDiscardPrompt: (index: number) => void;
  isConsultingExpert: number | null;
  onConsultExpert: (index: number) => void;
  pendingToolUpdates: Record<number, string[]>;
}

type RunnerTab = 'runner' | 'code' | 'prompts';

const RunnerControls: React.FC<Omit<FunctionRunnerProps, 'originalCode' | 'patchedCode' | 'originalPrompts' | 'editedPrompts' | 'setEditedPrompts' | 'onSavePrompt' | 'onDiscardPrompt' | 'isConsultingExpert' | 'onConsultExpert' | 'pendingToolUpdates'>> = ({
  isLoading,
  onExecute,
  availableFunctions,
  selectedFunction,
  setSelectedFunction,
  isGeneratingArgs,
  onScaffoldArgs,
  functionArgs,
  setFunctionArgs,
  inputFile,
  setInputFile,
  timeoutDuration,
  setTimeoutDuration,
  isDebugMode,
  setIsDebugMode,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputFile(event.target.files ? event.target.files[0] : null);
    if (event.target) {
      event.target.value = '';
    }
  };

  useEffect(() => {
    let objectUrl: string | null = null;
    if (inputFile && inputFile.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(inputFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [inputFile]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl fullWidth disabled={isLoading || isGeneratingArgs || availableFunctions.length === 0}>
        <InputLabel id="function-select-label">Exported Function</InputLabel>
        <Select
          labelId="function-select-label"
          id="function-select"
          value={selectedFunction}
          label="Exported Function"
          onChange={(e) => setSelectedFunction(e.target.value)}
        >
          {availableFunctions.length > 0 ? (
            availableFunctions.map(fn => <MenuItem key={fn} value={fn}>{fn}</MenuItem>)
          ) : (
            <MenuItem value="">No functions found in file</MenuItem>
          )}
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        onClick={onScaffoldArgs}
        disabled={isLoading || isGeneratingArgs || !selectedFunction}
        startIcon={isGeneratingArgs ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
      >
        {isGeneratingArgs ? 'Scaffolding...' : 'Scaffold Arguments'}
      </Button>

      <TextField
        id="function-args"
        label="Arguments (JSON)"
        multiline
        rows={5}
        fullWidth
        variant="outlined"
        placeholder={`{\n  "key": "value"\n}`}
        value={functionArgs}
        onChange={(e) => setFunctionArgs(e.target.value)}
        disabled={isLoading || isGeneratingArgs}
        InputProps={{ sx: { fontFamily: 'monospace' } }}
      />
      
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Attach File (Optional)
        </Typography>
        <Button
          component="label"
          variant="outlined"
          fullWidth
          startIcon={<UploadFileIcon />}
          sx={{
            height: '120px',
            borderStyle: 'dashed',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textTransform: 'none',
          }}
        >
            <input
                type="file"
                hidden
                onChange={handleFileChange}
                disabled={isLoading || isGeneratingArgs}
            />
             {inputFile ? (
              <Box sx={{ textAlign: 'center' }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="File preview" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', marginBottom: '8px' }} />
                ) : (
                  <ArticleIcon sx={{ fontSize: 40, mb: 1 }} />
                )}
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                    {inputFile.name}
                </Typography>
                <Button size="small" color="error" sx={{mt: 0.5}} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInputFile(null); }}>Remove</Button>
              </Box>
            ) : (
              <Typography color="text.secondary">Click to upload</Typography>
            )}
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
              <Typography variant="body2" component="div">Debug Mode</Typography>
              <Typography variant="caption" color="text.secondary">Log API calls and env access.</Typography>
          </Box>
          <Switch
            checked={isDebugMode}
            onChange={(e) => setIsDebugMode(e.target.checked)}
            disabled={isLoading}
            inputProps={{ 'aria-label': 'debug mode toggle' }}
          />
      </Paper>

      <TextField
        id="timeout-input"
        label="Execution Timeout (seconds)"
        type="number"
        value={timeoutDuration}
        onChange={(e) => setTimeoutDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
        fullWidth
        disabled={isLoading || isGeneratingArgs}
        InputProps={{ inputProps: { min: 1 } }}
      />

      <Button
        variant="contained"
        size="large"
        onClick={onExecute}
        disabled={isLoading || isGeneratingArgs || !selectedFunction}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Execute Function'}
      </Button>
    </Box>
  );
}


export const FunctionRunner: React.FC<FunctionRunnerProps> = (props) => {
  const [activeTab, setActiveTab] = useState<RunnerTab>('runner');

  useEffect(() => {
    if (props.hasFileLoaded) {
      setActiveTab('runner');
    }
  }, [props.hasFileLoaded, props.originalCode]);


  if (!props.hasFileLoaded) {
    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                textAlign: 'center',
                p: 3,
                borderStyle: 'dashed',
            }}
        >
            <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Start by loading your service file</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '400px' }}>
                Click the "Load Service File" button in the header to upload your `.js` file and discover its exported functions.
            </Typography>
        </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="runner tabs" variant="fullWidth">
            <Tab icon={<BuildIcon />} iconPosition="start" label="Runner" value="runner" />
            <Tab icon={<CodeIcon />} iconPosition="start" label="Code" value="code" />
            <Tab icon={<AutoAwesomeIcon />} iconPosition="start" label="Prompts" value="prompts" />
        </Tabs>
      </Box>
      
      <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.15)' }}>
        {activeTab === 'runner' && <RunnerControls {...props} />}
        {activeTab === 'code' && (
            <Grid container spacing={2} sx={{ height: '100%' }}>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">Original Uploaded Code</Typography>
                    <Paper component="pre" variant="outlined" sx={{ flexGrow: 1, overflow: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {props.originalCode || 'No file loaded'}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">Live Code (Executable)</Typography>
                     <Paper component="pre" variant="outlined" sx={{ flexGrow: 1, overflow: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {props.patchedCode || 'No file loaded'}
                    </Paper>
                </Grid>
            </Grid>
        )}
        {activeTab === 'prompts' && (
            <PromptEditor
                originalPrompts={props.originalPrompts}
                editedPrompts={props.editedPrompts}
                setEditedPrompts={props.setEditedPrompts}
                onSavePrompt={props.onSavePrompt}
                onDiscardPrompt={props.onDiscardPrompt}
                isConsultingExpert={props.isConsultingExpert}
                onConsultExpert={props.onConsultExpert}
                pendingToolUpdates={props.pendingToolUpdates}
            />
        )}
      </Box>
    </Paper>
  );
};
