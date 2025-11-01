import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FunctionRunner } from './components/FunctionRunner.js';
import { ResponseViewer } from './components/ResponseViewer.js';
import { extractExportedFunctionNames } from './services/functionExtractor.js';
import { GoogleGenAI } from '@google/genai';
import * as GoogleGenAIModule from '@google/genai';
import { extractPromptsFromFunction } from './services/promptExtractor.js';
import { getFunctionBody } from './services/codeUtilities.js';

import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Container, Grid, Box, Snackbar, Alert, Tabs, Tab } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#22d3ee', // cyan-400
    },
    secondary: {
      main: '#f0abfc', // fuchsia-300
    },
    background: {
      default: '#0f172a', // slate-900
      paper: '#1e293b', // slate-800
    },
    text: {
      primary: '#f1f5f9', // slate-100
      secondary: '#94a3b8', // slate-400
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const App = () => {
  const [fileContent, setFileContent] = useState(null);
  const [processedFileContent, setProcessedFileContent] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [selectedFunction, setSelectedFunction] = useState('');
  const [functionArgs, setFunctionArgs] = useState('{}');
  const [inputFile, setInputFile] = useState(null);
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [editedPrompts, setEditedPrompts] = useState({});
  const [pendingToolUpdates, setPendingToolUpdates] = useState({});


  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingArgs, setIsGeneratingArgs] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [isConsultingExpert, setIsConsultingExpert] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [executionStatus, setExecutionStatus] = useState('');
  const [executionLogs, setExecutionLogs] = useState([]);
  const [timeoutDuration, setTimeoutDuration] = useState(90);
  const [isDebugMode, setIsDebugMode] = useState(true);
  const [executedInputFileUrl, setExecutedInputFileUrl] = useState(null);
  const [mainTab, setMainTab] = useState('workbench');


  const fileInputRef = useRef(null);

  useEffect(() => {
    if (processedFileContent && selectedFunction) {
        const prompts = extractPromptsFromFunction(processedFileContent, selectedFunction);
        setOriginalPrompts(prompts);
        setEditedPrompts({}); // Reset edits when function or file content changes
        setPendingToolUpdates({}); // Reset pending tool updates as well
    } else {
        setOriginalPrompts([]);
        setEditedPrompts({});
    }
  }, [processedFileContent, selectedFunction]);


  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (content) {
        setIsFileProcessing(true);
        try {
            setToast({ message: `Analyzing and patching ${file.name}...`, severity: 'info' });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const patchPrompt = `You are an expert senior software engineer specializing in the Google Gemini API. Your task is to analyze the provided JavaScript file and apply necessary corrections to ensure it runs correctly in a browser-based workbench environment. You MUST return the ENTIRE, COMPLETE, corrected file content. Do not add comments, explanations, or markdown.

**MANDATORY CORRECTION RULES (APPLY THESE ONLY IF NEEDED):**

1.  **IDEMPOTENT ENVIRONMENT-AWARE API KEY in \`getApiKey\`:**
    *   **First, CHECK if the \`getApiKey\` function ALREADY contains the string \`process.env.BROWSER_ENV === 'true'\`.**
    *   **If it does,** you MUST NOT modify the function. Leave it exactly as it is.
    *   **If it does NOT,** you MUST modify the function to be environment-aware by wrapping the original code as shown in the example below. The wrapper MUST check for \`process.env.BROWSER_ENV === 'true'\`. If true, it returns \`process.env.API_KEY\`; if false, it executes the original server-side logic.
    *   **Example Structure to ADD if missing:**
        \`\`\`javascript
        const getApiKey = async () => {
          if (process.env.BROWSER_ENV === 'true') {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error('Workbench Error: API_KEY not provided.');
            return apiKey;
          } else {
            // ORIGINAL SERVER-SIDE CODE GOES HERE
          }
        };
        \`\`\`

2.  **ARCHITECTURAL REFACTOR in \`getPropertyMetadata\`:**
    *   **CHECK if the function uses a complex, unreliable multi-agent system.** IF IT DOES, you MUST refactor it to make a SINGLE Gemini API call.
    *   The refactored function MUST access the address via \`args.address\`. The old \`args.property.address\` structure is FORBIDDEN.
    *   Ensure the refactored function validates the presence of \`args.address\` and its fields (\`street\`, \`city\`, \`state\`, \`zip\`).

3.  **CORRECT API CALL STRUCTURE (Global):**
    *   **ENSURE** that for any \`generateContent\` call, the \`tools\` parameter is nested inside a \`config\` object.
    *   In \`getPropertyMetadata\`, ensure the \`tools\` array contains BOTH \`{googleSearch: {}}\` and \`{googleMaps: {}}\`.
    *   **Correct:** \`...({ config: { tools: [...] } })\`
    *   **Incorrect:** \`...({ tools: [...] })\` <-- FIX THIS IF YOU SEE IT.

4.  **CORRECT MODEL SELECTION (Global):**
    *   Ensure the following models are used. If other models like 'gemini-1.5-pro' are present, update them.
    *   \`getPropertyMetadata\` MUST use \`'gemini-2.5-flash'\`.
    *   \`identifyItemsInImage\` MUST use \`'gemini-2.5-pro'\`.

5.  **DEPRECATED SDK USAGE (Global):**
    *   **If you find** the deprecated \`genAI.getGenerativeModel(...)\` pattern, you MUST replace it with the correct direct call: \`genAI.models.generateContent({ ... })\`.

6.  **CRITICAL - DEPRECATED RESPONSE HANDLING (Global):**
    *   The current Gemini SDK returns a response object with a direct \`.text\` property. The old SDK returned a nested object. This is a common breaking change.
    *   You MUST find all instances where the code attempts to access the model's text output through a nested \`response\` object. This is **ALWAYS WRONG** with the current SDK.
    *   **Examples of the WRONG pattern to find and fix:**
        *   \`const text = result.response.text();\`
        *   \`const text = someVariable.response?.text();\`
        *   \`const jsonText = apiResult.response.text;\`
        *   \`return result.response;\` (when the calling code expects to do \`.text()\` on it later)
    *   **You MUST REPLACE** these with the correct, direct access pattern: \`result.text\`.
    *   **Example Fix:**
        *   **Incorrect:** \`const text = result.response.text();\`
        *   **Correct:** \`const text = result.text;\`
    *   This is a high-priority fix. Do not miss any occurrences.

7.  **API VIOLATION (Global):**
    *   **If** a \`config\` object uses the \`tools\` parameter, you MUST REMOVE any \`responseMimeType\` and \`responseSchema\` properties from that same config object.

8.  **JSON PARSING (Global):**
    *   **If** you remove \`responseMimeType: 'application/json'\` as per rule #7, you MUST add logic to manually parse the JSON from the model's text response, for example: \`result.text.match(/\\{[\\s\\S]*\\}/)\`.

9.  **VALIDATION in \`identifyItemsInImage\`:**
    *   **Ensure** the function validates that its input is a string starting with 'data:'. If this check is missing, add it to the top of the function.

10. **MODULE FORMAT (Global):**
    *   The file uses CommonJS. You MUST preserve this format (\`require\`, \`module.exports\`). DO NOT convert to ES Modules.

Apply ALL necessary fixes based on these rules and return the complete, corrected file. If no fixes are needed, return the original code unchanged.

**Original Code to Patch:**
\`\`\`javascript
${content}
\`\`\``;

            const patchResult = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: patchPrompt,
            });

            let patchedCode = patchResult.text.trim();
            if (patchedCode.startsWith('```javascript')) {
                patchedCode = patchedCode.substring(13);
            }
            if (patchedCode.endsWith('```')) {
                patchedCode = patchedCode.substring(0, patchedCode.length - 3);
            }

            const wasPatched = content.trim() !== patchedCode.trim();

            setFileContent(content);
            setProcessedFileContent(patchedCode);
            setFileName(file.name);
            
            const funcNames = extractExportedFunctionNames(patchedCode);
            if (funcNames.length === 0) {
                setToast({ message: `No exported functions found in ${file.name}.`, severity: 'error' });
                setAvailableFunctions([]);
                setSelectedFunction('');
            } else {
                setAvailableFunctions(funcNames);
                setSelectedFunction(funcNames[0] || '');
                if (wasPatched) {
                    setToast({ message: `${file.name} loaded and automatically patched for the Workbench environment.`, severity: 'success' });
                } else {
                    setToast({ message: `${file.name} loaded. No patches were needed.`, severity: 'success' });
                }
            }
        } catch (patchError) {
            setToast({ message: `Could not auto-patch file. Using original content. Error: ${patchError.message}`, severity: 'error' });
            setFileContent(content);
            setProcessedFileContent(content);
            setFileName(file.name);
            const funcNames = extractExportedFunctionNames(content);
             if (funcNames.length > 0) {
                setAvailableFunctions(funcNames);
                setSelectedFunction(funcNames[0] || '');
            }
        } finally {
            setIsFileProcessing(false);
        }
      } else {
        setToast({ message: 'Could not read file content.', severity: 'error' });
      }
    };
    reader.onerror = () => {
        setToast({ message: 'Error reading file.', severity: 'error' });
    }
    reader.readAsText(file);
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleExportFile = useCallback(() => {
    if (!processedFileContent || !fileName) {
      setToast({ message: 'No file loaded to export.', severity: 'error' });
      return;
    }

    try {
        const blob = new Blob([processedFileContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: `Exported ${fileName} with your saved prompt changes.`, severity: 'success' });
    } catch (e) {
        setToast({ message: 'Failed to export file.', severity: 'error' });
    }
  }, [processedFileContent, fileName]);

  const handlePromptSave = useCallback((promptIndex) => {
    const originalPrompt = originalPrompts[promptIndex];
    const editedPrompt = editedPrompts[promptIndex];

    if (!processedFileContent || !originalPrompt || editedPrompt === undefined || originalPrompt === editedPrompt) {
        setToast({ message: 'No changes to save.', severity: 'error' });
        return;
    }
    
    let newProcessedContent = processedFileContent;
    let toastMessage = 'Prompt updated and saved.';

    const requiredTools = pendingToolUpdates[promptIndex];
    if (requiredTools && requiredTools.length > 0) {
        const functionBody = getFunctionBody(newProcessedContent, selectedFunction);
        if (functionBody) {
            const toolsRegex = /tools:\s*\[[\s\S]*?\]/g;
            if (toolsRegex.test(functionBody)) {
                const newToolsString = `tools: [${requiredTools.map(t => `{ ${t}: {} }`).join(', ')}]`;
                const newFunctionBody = functionBody.replace(toolsRegex, newToolsString);
                newProcessedContent = newProcessedContent.replace(functionBody, newFunctionBody);
                toastMessage = 'Prompt and required tools updated.';
            }
        }
    }

    newProcessedContent = newProcessedContent.replace(originalPrompt, editedPrompt);
    setProcessedFileContent(newProcessedContent);
    
    const newEdited = { ...editedPrompts };
    delete newEdited[promptIndex];
    setEditedPrompts(newEdited);
    
    const newPending = { ...pendingToolUpdates };
    delete newPending[promptIndex];
    setPendingToolUpdates(newPending);

    setToast({ message: toastMessage, severity: 'success' });
  }, [processedFileContent, originalPrompts, editedPrompts, selectedFunction, pendingToolUpdates]);
  
  const handlePromptDiscard = useCallback((promptIndex) => {
      const newEdited = { ...editedPrompts };
      delete newEdited[promptIndex];
      setEditedPrompts(newEdited);
      
      const newPending = { ...pendingToolUpdates };
      delete newPending[promptIndex];
      setPendingToolUpdates(newPending);
  }, [editedPrompts, pendingToolUpdates]);

  const handleConsultExpert = useCallback(async (promptIndex) => {
    const userPrompt = editedPrompts[promptIndex] ?? originalPrompts[promptIndex];
    if (!userPrompt) {
        setToast({ message: 'Cannot consult on an empty prompt.', severity: 'error' });
        return;
    }

    setIsConsultingExpert(promptIndex);
    setToast({ message: 'Consulting prompt expert...', severity: 'info' });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const metaPrompt = `You are a world-class prompt engineering expert specializing in the Google Gemini API. Your task is to analyze the user's prompt and rewrite it to be more effective.

**Context:**
The user is providing a prompt that will be used inside a larger system to call the Gemini API. The goal is to get a reliable, structured response (often JSON). The prompt is provided inside JavaScript template literals (\`\`).

**Instructions:**
1.  **Analyze and Refine:** Read the user's prompt carefully. Improve its clarity, specificity, and structure.
2.  **Add Best Practices:** Incorporate prompt engineering best practices. This may include:
    *   Defining a clear persona for the AI (e.g., "You are an expert...").
    *   Adding explicit constraints to prevent hallucinations (e.g., "DO NOT invent data...").
    *   Specifying the exact output format and structure (e.g., "Return ONLY the raw JSON object...").
    *   Adding "CRITICAL INSTRUCTIONS" for emphasis on key requirements.
3.  **Preserve Intent:** You MUST preserve the original intent and any dynamic template literal variables (e.g., \`\${variableName}\`). Do not remove or change these variables.
4.  **Output:** Return ONLY the revised, complete prompt text. Do not include explanations, apologies, markdown formatting (like \`\`\` backticks), or any text other than the prompt itself.

**User's Prompt to Improve:**
---
${userPrompt}
---`;

        const promptResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: metaPrompt,
        });
        const improvedPrompt = promptResponse.text.trim();

        const toolAnalysisPrompt = `Analyze the following prompt and determine which of the following tools it requires to execute successfully: "googleSearch", "googleMaps".
Respond with ONLY a valid, raw JSON array of strings containing the required tool names.
If no tools are required, return an empty array [].

Example responses:
- ["googleSearch"]
- ["googleSearch", "googleMaps"]
- []

Prompt to analyze:
---
${improvedPrompt}
---`;
        
        const toolsResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: toolAnalysisPrompt });
        
        let requiredTools = [];
        try {
            const jsonMatch = toolsResponse.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                requiredTools = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Could not parse tool analysis response:", toolsResponse.text);
        }

        setEditedPrompts(prev => ({
            ...prev,
            [promptIndex]: `\`${improvedPrompt.replace(/`/g, '\\`')}\``,
        }));
        
        if (requiredTools.length > 0) {
            setPendingToolUpdates(prev => ({
                ...prev,
                [promptIndex]: requiredTools
            }));
             setToast({ message: 'Expert feedback applied. A tool configuration update is pending your save.', severity: 'success' });
        } else {
            if(pendingToolUpdates[promptIndex]){
              const newPending = { ...pendingToolUpdates };
              delete newPending[promptIndex];
              setPendingToolUpdates(newPending);
            }
            setToast({ message: 'Expert feedback applied. Review and save the changes.', severity: 'success' });
        }

    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setToast({ message: `Failed to get expert feedback: ${message}`, severity: 'error' });
    } finally {
        setIsConsultingExpert(null);
    }
  }, [originalPrompts, editedPrompts, pendingToolUpdates]);


  const handleScaffoldArgs = useCallback(async () => {
    if (!selectedFunction) {
      setToast({ message: 'Please select a function first.', severity: 'error' });
      return;
    }
    setIsGeneratingArgs(true);
    setError(null);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const prompt = `You are an intelligent assistant that creates a JSON argument template for a JavaScript function. Your response MUST be ONLY the raw, parsable JSON object. Do not include markdown, comments, or explanations.

Function Name: '${selectedFunction}'

**Instructions:**
1. For 'getPropertyMetadata', create a JSON object with a single "address" key. The "address" key should contain an object with "street", "city", "state", and "zip". Use realistic placeholder values. DO NOT nest this inside a "property" key.
2. For any other function, infer a likely JSON structure.

**Example for 'getPropertyMetadata':**
{
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zip": "12345"
  }
}`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const generatedText = response.text.trim();
      
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : '{}';

      try {
        const parsedJson = JSON.parse(jsonString);
        setFunctionArgs(JSON.stringify(parsedJson, null, 2));
        setToast({ message: 'Arguments scaffolded successfully. Please fill in placeholder values.', severity: 'success' });
      } catch (e) {
        throw new Error("The AI generated invalid JSON. Please try again or enter it manually.");
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred while generating arguments.';
      setError(message);
      setToast({ message, severity: 'error' });
    } finally {
      setIsGeneratingArgs(false);
    }
  }, [selectedFunction]);

  const handleExecute = useCallback(async () => {
    if (!processedFileContent || !selectedFunction) {
      setError("Please load a file and select a function to execute.");
      return;
    }

    setMainTab('results');
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setExecutionLogs([]);
    setExecutionStatus('Initializing...');
    setExecutedInputFileUrl(null);

    let inputFileDataUrl = null;
    if (inputFile) {
      setExecutionStatus('Reading attached file...');
      const promise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result !== 'string') {
                reject(new Error("File could not be read as a data URL. The result was not a string."));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(new Error(`Error reading file: ${reader.error?.message || 'Unknown error'}`));
        reader.readAsDataURL(inputFile);
      });
      inputFileDataUrl = await promise;
      setExecutedInputFileUrl(inputFileDataUrl);
    }

    const originalConsole = window.console;
    const newConsole = {
        ...originalConsole,
        log: (...args) => {
            setExecutionLogs(prev => [...prev, `[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`]);
            originalConsole.log.apply(originalConsole, args);
        },
        error: (...args) => {
            const formattedError = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object' && a !== null) return JSON.stringify(a, null, 2);
                return String(a);
            }).join(' ');
            setExecutionLogs(prev => [...prev, `[ERROR] ${formattedError}`]);
            originalConsole.error.apply(originalConsole, args);
        },
        warn: (...args) => {
            setExecutionLogs(prev => [...prev, `[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`]);
            originalConsole.warn.apply(originalConsole, args);
        },
    };

    try {
      if (isDebugMode) {
        window.console = newConsole;
      }
      setExecutionStatus('Preparing execution context...');
      
      let codeToExecute = processedFileContent;
      if (Object.keys(editedPrompts).length > 0 && originalPrompts.length > 0) {
          setExecutionStatus('Applying unsaved prompt edits for this trial execution...');
          
          originalPrompts.forEach((originalPrompt, index) => {
              const editedPrompt = editedPrompts[index];
              if (editedPrompt && editedPrompt !== originalPrompt) {
                  codeToExecute = codeToExecute.replace(originalPrompt, editedPrompt);
              }
          });
      }

      let userModule;
      const isEsModule = /export\s/g.test(codeToExecute) && !/module\.exports|exports\./g.test(codeToExecute);

      const hostApiKey = process.env.API_KEY;

      if (isEsModule) {
        setExecutionStatus('Loading as ES Module...');
        const fullCodeWithPolyfill = `
          const envProxyHandler = {
            get: (target, prop, receiver) => {
              if (prop === 'API_KEY') {
                return '${hostApiKey}';
              }
              if (prop === 'BROWSER_ENV') {
                return 'true';
              }
              return 'dummy-value-for-workbench-env';
            }
          };
          const process = { env: new Proxy({}, envProxyHandler) };
          ${codeToExecute}
        `;
        const blob = new Blob([fullCodeWithPolyfill], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        userModule = await import(/* @vite-ignore */ url);
        URL.revokeObjectURL(url);
      } else { // CommonJS
        setExecutionStatus('Loading as CommonJS Module...');
        const exports = {};
        const module = { exports };
        
        const envProxyHandler = {
            get: (target, prop, receiver) => {
                if (prop === 'API_KEY') {
                    return hostApiKey;
                }
                 if (prop === 'BROWSER_ENV') {
                    newConsole.log(`[LOG] [Workbench] Intercepted access to process.env.BROWSER_ENV. Returning 'true' for browser context.`);
                    return 'true';
                }
                if (prop === 'GEMINI_API_KEY_SECRET_NAME') {
                    newConsole.log(`[LOG] [Workbench] Intercepted access to process.env.GEMINI_API_KEY_SECRET_NAME. Returning a placeholder value for the mock secret manager.`);
                    return 'projects/workbench-mock/secrets/GEMINI_API_KEY/versions/latest';
                }
                newConsole.warn(`[WARN] [Workbench] Code accessed undefined environment variable: process.env.${String(prop)}. Returning undefined.`);
                return undefined;
            }
        };
        const sandboxedProcess = { env: new Proxy({}, envProxyHandler) };
        
        const requirePolyfill = (moduleName) => {
            if (moduleName === '@google/genai') {
              if (isDebugMode) {
                newConsole.log('[LOG] [Workbench] Intercepting "@google/genai" to add API call logging.');
                const originalGenAIModule = GoogleGenAIModule;
            
                const modelsProxyHandler = {
                    get(target, prop, receiver) {
                        const originalMethod = target[prop];
                        if (prop === 'generateContent' && typeof originalMethod === 'function') {
                            return async function(...args) {
                                const request = args[0] || {};
                                const loggableRequest = JSON.parse(JSON.stringify(request));
                                if (loggableRequest.contents?.parts) {
                                    loggableRequest.contents.parts = loggableRequest.contents.parts.map((part) => {
                                        if (part.inlineData) {
                                            return { ...part, inlineData: { ...part.inlineData, data: `[...base64 data of type ${part.inlineData.mimeType}...]` } };
                                        }
                                        return part;
                                    });
                                }
                                newConsole.log(`[LOG] [Workbench] Calling genAI.models.generateContent with request:`, loggableRequest);
            
                                try {
                                    const result = await originalMethod.apply(target, args);
                                    const loggableResult = { text: result.text, candidates: result.candidates };
                                    newConsole.log(`[LOG] [Workbench] Received response from genAI.models.generateContent:`, loggableResult);
                                    return result;
                                } catch (apiError) {
                                    newConsole.error(`[ERROR] [Workbench] Error from genAI.models.generateContent API call:`, apiError);
                                    throw apiError;
                                }
                            };
                        }
                        return Reflect.get(target, prop, receiver);
                    }
                };
            
                const constructorProxyHandler = {
                    construct(target, args) {
                        newConsole.log('[LOG] [Workbench] new GoogleGenAI() called.');
                        const aiInstance = new target(...args);
                        aiInstance.models = new Proxy(aiInstance.models, modelsProxyHandler);
                        return aiInstance;
                    }
                };
                
                const GoogleGenAIProxy = new Proxy(originalGenAIModule.GoogleGenAI, constructorProxyHandler);
            
                return {
                    ...originalGenAIModule,
                    GoogleGenAI: GoogleGenAIProxy,
                };
              }
              return GoogleGenAIModule;
            }

            if (moduleName === '@google-cloud/secret-manager') {
                newConsole.log('[LOG] [Workbench] Intercepted request for "@google-cloud/secret-manager". Providing a specialized mock to handle API key retrieval.');
                
                class MockSecretManagerServiceClient {
                    accessSecretVersion(request) {
                        newConsole.log(`[LOG] [Workbench] Mock SecretManagerServiceClient.accessSecretVersion called with name: "${request.name}".`);
                        
                        const expectedSecretName = 'projects/workbench-mock/secrets/GEMINI_API_KEY/versions/latest';
                        if (request.name !== expectedSecretName) {
                            newConsole.error(`[ERROR] [Workbench] Mock secret manager received an unexpected secret name. Expected "${expectedSecretName}", but got "${request.name}".`);
                            const err = new Error(`Secret with name ${request.name} not found in mock.`);
                            err.code = 5; // Mimic gRPC NOT_FOUND code
                            return Promise.reject(err);
                        }

                        const mockVersion = {
                            payload: {
                                data: {
                                    toString: (encoding = 'utf8') => {
                                        newConsole.log(`[LOG] [Workbench] Mock secret payload's .toString('${encoding}') method called. Returning host API key.`);
                                        return hostApiKey;
                                    }
                                },
                            },
                        };

                        newConsole.log('[LOG] [Workbench] Returning a mock secret payload.');
                        return Promise.resolve([mockVersion]);
                    }
                    
                    close() {
                        newConsole.log('[LOG] [Workbench] Mock SecretManagerServiceClient.close called.');
                        return Promise.resolve();
                    }
                }

                return {
                    SecretManagerServiceClient: MockSecretManagerServiceClient,
                };
            }

            newConsole.warn(`[WARN] [Workbench] Unsupported module "${moduleName}" required. A mock is being provided, so functionality may be limited.`);

            const handler = {
                get: function(target, prop, receiver) {
                    newConsole.warn(`[WARN] [Workbench] Mocked module "${moduleName}": Accessed property "${String(prop)}". Returning a mock function.`);
                    return new Proxy(function() {}, handler);
                },
                apply: function(target, thisArg, argumentsList) {
                    newConsole.warn(`[WARN] [Workbench] Mocked module "${moduleName}": Called as a function.`);
                    return new Proxy(function() {}, handler);
                },
                construct: function(target, args) {
                    newConsole.warn(`[WARN] [Workbench] Mocked module "${moduleName}": Used with "new" keyword.`);
                    return new Proxy({}, handler);
                }
            };
            return new Proxy(function() {}, handler);
        };
        
        const userCodeExecutor = new Function('module', 'exports', 'process', 'require', codeToExecute);
        userCodeExecutor(module, exports, sandboxedProcess, requirePolyfill);
        
        userModule = module.exports;
      }

      if (!userModule) {
        throw new Error("The loaded file did not produce any exports.");
      }

      setExecutionStatus(`Searching for function "${selectedFunction}"...`);
      const funcToExecute = userModule[selectedFunction];
      if (typeof funcToExecute !== 'function') {
        throw new Error(`Could not find exported function "${selectedFunction}" in the loaded file.`);
      }
      
      let argsForExecution;
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(functionArgs);
      } catch (e) {
        throw new Error("Invalid JSON in arguments field.");
      }

      if (inputFileDataUrl && Object.keys(parsedArgs).length === 0) {
        setExecutionStatus('Passing file data URL as the primary argument...');
        argsForExecution = inputFileDataUrl;
      } else {
        setExecutionStatus('Passing JSON arguments object...');
        const payload = { ...parsedArgs };
        if (inputFileDataUrl && inputFile) {
            payload.file = {
                dataUrl: inputFileDataUrl,
                mimeType: inputFile.type,
                name: inputFile.name,
            };
        }
        argsForExecution = payload;
      }

      setExecutionStatus('Calling function... (This may involve API calls to Gemini)');
      
      const executionPromise = funcToExecute(argsForExecution);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Function execution timed out after ${timeoutDuration} seconds. Check the execution logs for progress. Common causes include infinite loops, unresolved promises, or long-running API calls. You can try increasing the timeout duration.`));
        }, timeoutDuration * 1000);
      });

      const result = await Promise.race([
        executionPromise,
        timeoutPromise,
      ]);

      setExecutionStatus('Processing function response...');
      let resultText;
      if (typeof result === 'object' && result !== null) {
          resultText = 'text' in result ? String(result.text) : JSON.stringify(result, null, 2);
      } else {
          resultText = String(result);
      }
      
      const sources = (typeof result === 'object' && result !== null && 'sources' in result) ? result.sources : undefined;

      setResponse({ text: resultText, sources });

    } catch (err) {
      let errorMessage = 'An unknown execution error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
        const errorDetails = err.cause || err.response;
        if (errorDetails) {
            try {
                errorMessage += `\n\n--- Error Details ---\n${JSON.stringify(errorDetails, null, 2)}`;
            } catch (e) {
                errorMessage += `\n\n--- Error Details ---\nCould not stringify error details.`;
            }
        }
        if (err.stack) {
            errorMessage += `\n\n--- Stack Trace ---\n${err.stack}`;
        }
      } else if (err) {
        try {
            errorMessage += `\n\n--- Error Payload ---\n${JSON.stringify(err, null, 2)}`;
        } catch (e) {
            errorMessage += `\n\n--- Error Payload ---\nCould not stringify error payload.`;
        }
      }
      
      setError(errorMessage);
      window.console.error('[Workbench Execution Error]', err);
    } finally {
      window.console = originalConsole;
      setIsLoading(false);
      setExecutionStatus('');
    }
  }, [processedFileContent, selectedFunction, functionArgs, inputFile, timeoutDuration, isDebugMode, editedPrompts, originalPrompts]);

  return React.createElement(ThemeProvider, { theme: darkTheme },
    React.createElement(CssBaseline),
    React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', minHeight: '100vh' } },
      React.createElement(AppBar, { position: "sticky", color: "default", elevation: 1, sx: { bgcolor: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(8px)' } },
        React.createElement(Container, { maxWidth: "xl" },
          React.createElement(Toolbar, { disableGutters: true },
            React.createElement(ScienceIcon, { sx: { mr: 1, color: 'primary.main' } }),
            React.createElement(Typography, { variant: "h6", noWrap: true, component: "div", sx: { mr: 2, flexGrow: { xs: 1, md: 0 } } }, "Jules Gemini Workbench"),
            React.createElement(Box, { sx: { flexGrow: 1, display: { xs: 'none', md: 'flex' } } }),
            React.createElement(Box, { sx: { display: 'flex', gap: 2 } },
              React.createElement('input', { type: "file", ref: fileInputRef, onChange: handleFileSelect, style: { display: 'none' }, accept: ".js,.ts" }),
              React.createElement(Button, {
                  variant: "outlined",
                  color: "primary",
                  startIcon: isFileProcessing ? React.createElement(CircularProgress, { size: 20, color: "inherit" }) : React.createElement(UploadFileIcon),
                  onClick: () => fileInputRef.current?.click(),
                  disabled: isFileProcessing,
                  sx: { width: '220px' }
                },
                isFileProcessing ? 'Processing...' : (fileName ? `Loaded: ${fileName}` : 'Load Service File')
              ),
              React.createElement(Button, {
                  variant: "outlined",
                  color: "primary",
                  startIcon: React.createElement(DownloadIcon),
                  onClick: handleExportFile,
                  disabled: !processedFileContent || isFileProcessing
                },
                "Download Updated File"
              )
            )
          )
        )
      ),
      React.createElement(Container, { component: "main", maxWidth: "xl", sx: { flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' } },
        React.createElement(Box, { sx: { borderBottom: 1, borderColor: 'divider' } },
          React.createElement(Tabs, { value: mainTab, onChange: (e, newValue) => setMainTab(newValue), "aria-label": "Main workbench tabs" },
            React.createElement(Tab, { label: "Workbench", value: "workbench" }),
            React.createElement(Tab, { label: "Results", value: "results" })
          )
        ),
        React.createElement(Box, { sx: { flexGrow: 1, pt: 3, height: '100%' } },
          mainTab === 'workbench' && React.createElement(FunctionRunner, {
            isLoading: isLoading,
            onExecute: handleExecute,
            availableFunctions: availableFunctions,
            selectedFunction: selectedFunction,
            setSelectedFunction: setSelectedFunction,
            isGeneratingArgs: isGeneratingArgs,
            onScaffoldArgs: handleScaffoldArgs,
            functionArgs: functionArgs,
            setFunctionArgs: setFunctionArgs,
            inputFile: inputFile,
            setInputFile: setInputFile,
            hasFileLoaded: !!processedFileContent,
            timeoutDuration: timeoutDuration,
            setTimeoutDuration: setTimeoutDuration,
            isDebugMode: isDebugMode,
            setIsDebugMode: setIsDebugMode,
            originalCode: fileContent,
            patchedCode: processedFileContent,
            originalPrompts: originalPrompts,
            editedPrompts: editedPrompts,
            setEditedPrompts: setEditedPrompts,
            onSavePrompt: handlePromptSave,
            onDiscardPrompt: handlePromptDiscard,
            isConsultingExpert: isConsultingExpert,
            onConsultExpert: handleConsultExpert,
            pendingToolUpdates: pendingToolUpdates,
          }),
          mainTab === 'results' && React.createElement(ResponseViewer, {
            response: response?.text ?? '',
            sources: response?.sources,
            isLoading: isLoading,
            error: error,
            statusMessage: executionStatus,
            logs: executionLogs,
            imageUrl: executedInputFileUrl,
          })
        )
      ),
      toast && React.createElement(Snackbar, {
          open: !!toast,
          autoHideDuration: 6000,
          onClose: () => setToast(null),
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
        },
        React.createElement(Alert, { onClose: () => setToast(null), severity: toast.severity, sx: { width: '100%' } },
          toast.message
        )
      )
    )
  );
};

export default App;
