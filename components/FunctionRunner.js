import React, { useState, useEffect } from 'react';
import { PromptEditor } from './PromptEditor.js';
import { Box, Paper, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, TextField, CircularProgress, Typography, Switch, Grid, FormControlLabel } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import ArticleIcon from '@mui/icons-material/Article';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const RunnerControls = ({
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
  onSetApiKey,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (event) => {
    setInputFile(event.target.files ? event.target.files[0] : null);
    if (event.target) {
      event.target.value = '';
    }
  };

  useEffect(() => {
    let objectUrl = null;
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

  return React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 3 } },
    React.createElement(FormControl, { fullWidth: true, disabled: isLoading || isGeneratingArgs || availableFunctions.length === 0 },
      React.createElement(InputLabel, { id: "function-select-label" }, "Exported Function"),
      React.createElement(Select, {
          labelId: "function-select-label",
          id: "function-select",
          value: selectedFunction,
          label: "Exported Function",
          onChange: (e) => setSelectedFunction(e.target.value)
        },
        availableFunctions.length > 0 ?
        availableFunctions.map(fn => React.createElement(MenuItem, { key: fn, value: fn }, fn)) :
        React.createElement(MenuItem, { value: "" }, "No functions found in file")
      )
    ),
    React.createElement(Button, {
        variant: "outlined",
        onClick: onScaffoldArgs,
        disabled: isLoading || isGeneratingArgs || !selectedFunction,
        startIcon: isGeneratingArgs ? React.createElement(CircularProgress, { size: 20, color: "inherit" }) : React.createElement(AutoAwesomeIcon)
      },
      isGeneratingArgs ? 'Scaffolding...' : 'Scaffold Arguments'
    ),
    React.createElement(TextField, {
      id: "function-args",
      label: "Arguments (JSON)",
      multiline: true,
      rows: 5,
      fullWidth: true,
      variant: "outlined",
      placeholder: `{\n  "key": "value"\n}`,
      value: functionArgs,
      onChange: (e) => setFunctionArgs(e.target.value),
      disabled: isLoading || isGeneratingArgs,
      InputProps: { sx: { fontFamily: 'monospace' } }
    }),
    React.createElement(Box, null,
      React.createElement(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true }, "Attach File (Optional)"),
      React.createElement(Button, {
          component: "label",
          variant: "outlined",
          fullWidth: true,
          startIcon: React.createElement(UploadFileIcon),
          sx: {
            height: '120px',
            borderStyle: 'dashed',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textTransform: 'none',
          }
        },
        React.createElement('input', {
          type: "file",
          hidden: true,
          onChange: handleFileChange,
          disabled: isLoading || isGeneratingArgs
        }),
        inputFile ? React.createElement(Box, { sx: { textAlign: 'center' } },
          previewUrl ?
          React.createElement('img', { src: previewUrl, alt: "File preview", style: { maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', marginBottom: '8px' } }) :
          React.createElement(ArticleIcon, { sx: { fontSize: 40, mb: 1 } }),
          React.createElement(Typography, { variant: "body2", sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' } }, inputFile.name),
          React.createElement(Button, { size: "small", color: "error", sx: { mt: 0.5 }, onClick: (e) => { e.preventDefault(); e.stopPropagation(); setInputFile(null); } }, "Remove")
        ) : React.createElement(Typography, { color: "text.secondary" }, "Click to upload")
      )
    ),
    React.createElement(Paper, { variant: "outlined", sx: { p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement(Box, null,
        React.createElement(Typography, { variant: "body2", component: "div" }, "Debug Mode"),
        React.createElement(Typography, { variant: "caption", color: "text.secondary" }, "Log API calls and env access.")
      ),
      React.createElement(Switch, {
        checked: isDebugMode,
        onChange: (e) => setIsDebugMode(e.target.checked),
        disabled: isLoading,
        inputProps: { 'aria-label': 'debug mode toggle' }
      })
    ),
    React.createElement(TextField, {
      id: "timeout-input",
      label: "Execution Timeout (seconds)",
      type: "number",
      value: timeoutDuration,
      onChange: (e) => setTimeoutDuration(Math.max(1, parseInt(e.target.value, 10) || 1)),
      fullWidth: true,
      disabled: isLoading || isGeneratingArgs,
      InputProps: { inputProps: { min: 1 } }
    }),
     React.createElement(Button, {
        variant: "text",
        size: "small",
        onClick: onSetApiKey,
        disabled: isLoading,
        startIcon: React.createElement(VpnKeyIcon)
      },
      'Change API Key'
    ),
    React.createElement(Button, {
        variant: "contained",
        size: "large",
        onClick: onExecute,
        disabled: isLoading || isGeneratingArgs || !selectedFunction,
        sx: { mt: 1 }
      },
      isLoading ? React.createElement(CircularProgress, { size: 24, color: "inherit" }) : 'Execute Function'
    )
  );
}

export const FunctionRunner = (props) => {
  const [activeTab, setActiveTab] = useState('runner');

  useEffect(() => {
    if (props.hasFileLoaded) {
      setActiveTab('runner');
    }
  }, [props.hasFileLoaded, props.originalCode]);


  if (!props.hasFileLoaded) {
    return React.createElement(Paper, {
        variant: "outlined",
        sx: {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
          borderStyle: 'dashed',
        }
      },
      React.createElement(UploadFileIcon, { sx: { fontSize: 48, color: 'text.secondary', mb: 2 } }),
      React.createElement(Typography, { variant: "h6", gutterBottom: true }, "Start by loading your service file"),
      React.createElement(Typography, { variant: "body2", color: "text.secondary", sx: { maxWidth: '400px' } },
        "Click the \"Load Service File\" button in the header to upload your `.js` file and discover its exported functions."
      )
    );
  }

  return React.createElement(Paper, { elevation: 2, sx: { display: 'flex', flexDirection: 'column', height: '100%' } },
    React.createElement(Box, { sx: { borderBottom: 1, borderColor: 'divider' } },
      React.createElement(Tabs, { value: activeTab, onChange: (e, newValue) => setActiveTab(newValue), "aria-label": "runner tabs", variant: "fullWidth" },
        React.createElement(Tab, { icon: React.createElement(BuildIcon), iconPosition: "start", label: "Runner", value: "runner" }),
        React.createElement(Tab, { icon: React.createElement(CodeIcon), iconPosition: "start", label: "Code", value: "code" }),
        React.createElement(Tab, { icon: React.createElement(AutoAwesomeIcon), iconPosition: "start", label: "Prompts", value: "prompts" })
      )
    ),
    React.createElement(Box, { sx: { p: 3, flexGrow: 1, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.15)' } },
      activeTab === 'runner' && React.createElement(RunnerControls, props),
      activeTab === 'code' && React.createElement(Grid, { container: true, spacing: 2, sx: { height: '100%' } },
        React.createElement(Grid, { item: true, xs: 12, md: 6, sx: { display: 'flex', flexDirection: 'column' } },
          React.createElement(Typography, { variant: "subtitle2", gutterBottom: true, color: "text.secondary" }, "Original Uploaded Code"),
          React.createElement(Paper, { component: "pre", variant: "outlined", sx: { flexGrow: 1, overflow: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' } },
            props.originalCode || 'No file loaded'
          )
        ),
        React.createElement(Grid, { item: true, xs: 12, md: 6, sx: { display: 'flex', flexDirection: 'column' } },
          React.createElement(Typography, { variant: "subtitle2", gutterBottom: true, color: "text.secondary" }, "Live Code (Executable)"),
          React.createElement(Paper, { component: "pre", variant: "outlined", sx: { flexGrow: 1, overflow: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' } },
            props.patchedCode || 'No file loaded'
          )
        )
      ),
      activeTab === 'prompts' && React.createElement(PromptEditor, {
        originalPrompts: props.originalPrompts,
        editedPrompts: props.editedPrompts,
        setEditedPrompts: props.setEditedPrompts,
        onSavePrompt: props.onSavePrompt,
        onDiscardPrompt: props.onDiscardPrompt,
        isConsultingExpert: props.isConsultingExpert,
        onConsultExpert: props.onConsultExpert,
        pendingToolUpdates: props.pendingToolUpdates,
      })
    )
  );
};