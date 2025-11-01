
import React, { useState, useCallback, useRef, FC, Fragment, useEffect } from 'react';
import { FunctionRunner } from './components/FunctionRunner';
import { ResponseViewer } from './components/ResponseViewer';
import { BotIcon } from './components/icons/BotIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { extractExportedFunctionNames } from './services/functionExtractor';
import { Toast } from './components/Toast';
import { GoogleGenAI } from '@google/genai';
import * as GoogleGenAIModule from '@google/genai';
import { extractPromptsFromFunction } from './services/promptExtractor';
import { getFunctionBody } from './services/codeUtilities';

export interface GenerationResult {
  text: string;
  sources: any[] | undefined;
}

const App: FC = () => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [processedFileContent, setProcessedFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionArgs, setFunctionArgs] = useState('{}');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [originalPrompts, setOriginalPrompts] = useState<string[]>([]);
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({});
  const [pendingToolUpdates, setPendingToolUpdates] = useState<Record<number, string[]>>({});


  const [response, setResponse] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingArgs, setIsGeneratingArgs] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [isConsultingExpert, setIsConsultingExpert] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [timeoutDuration, setTimeoutDuration] = useState<number>(90);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(true);
  const [executedInputFileUrl, setExecutedInputFileUrl] = useState<string | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);

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


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        setIsFileProcessing(true);
        try {
            setToast({ message: `Analyzing and patching ${file.name}...`, type: 'success' });
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
                setToast({ message: `No exported functions found in ${file.name}.`, type: 'error' });
                setAvailableFunctions([]);
                setSelectedFunction('');
            } else {
                setAvailableFunctions(funcNames);
                setSelectedFunction(funcNames[0] || '');
                if (wasPatched) {
                    setToast({ message: `${file.name} loaded and automatically patched for the Workbench environment.`, type: 'success' });
                } else {
                    setToast({ message: `${file.name} loaded. No patches were needed.`, type: 'success' });
                }
            }
        } catch (patchError) {
            setToast({ message: `Could not auto-patch file. Using original content. Error: ${(patchError as Error).message}`, type: 'error' });
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
        setToast({ message: 'Could not read file content.', type: 'error' });
      }
    };
    reader.onerror = () => {
        setToast({ message: 'Error reading file.', type: 'error' });
    }
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportFile = useCallback(() => {
    if (!processedFileContent || !fileName) {
      setToast({ message: 'No file loaded to export.', type: 'error' });
      return;
    }

    try {
        // The processedFileContent is now the single source of truth for saved prompts.
        const blob = new Blob([processedFileContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: `Exported ${fileName} with your saved prompt changes.`, type: 'success' });
    } catch (e) {
        setToast({ message: 'Failed to export file.', type: 'error' });
    }
  }, [processedFileContent, fileName]);

  const handlePromptSave = useCallback((promptIndex: number) => {
    const originalPrompt = originalPrompts[promptIndex];
    const editedPrompt = editedPrompts[promptIndex];

    if (!processedFileContent || !originalPrompt || editedPrompt === undefined || originalPrompt === editedPrompt) {
        setToast({ message: 'No changes to save.', type: 'error' });
        return;
    }
    
    let newProcessedContent = processedFileContent;
    let toastMessage = 'Prompt updated and saved.';

    // 1. Check for and apply pending tool updates before updating the prompt text
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

    // 2. Update the prompt text itself on the (potentially) tool-updated content
    newProcessedContent = newProcessedContent.replace(originalPrompt, editedPrompt);
    setProcessedFileContent(newProcessedContent);
    
    // 3. The new content will trigger the useEffect to re-extract prompts,
    // which becomes the new "original" baseline.
    
    // 4. Clean up states for this specific prompt
    const newEdited = { ...editedPrompts };
    delete newEdited[promptIndex];
    setEditedPrompts(newEdited);
    
    const newPending = { ...pendingToolUpdates };
    delete newPending[promptIndex];
    setPendingToolUpdates(newPending);

    setToast({ message: toastMessage, type: 'success' });
  }, [processedFileContent, originalPrompts, editedPrompts, selectedFunction, pendingToolUpdates]);
  
  const handlePromptDiscard = useCallback((promptIndex: number) => {
      const newEdited = { ...editedPrompts };
      delete newEdited[promptIndex];
      setEditedPrompts(newEdited);
      
      const newPending = { ...pendingToolUpdates };
      delete newPending[promptIndex];
      setPendingToolUpdates(newPending);
  }, [editedPrompts, pendingToolUpdates]);

  const handleConsultExpert = useCallback(async (promptIndex: number) => {
    const userPrompt = editedPrompts[promptIndex] ?? originalPrompts[promptIndex];
    if (!userPrompt) {
        setToast({ message: 'Cannot consult on an empty prompt.', type: 'error' });
        return;
    }

    setIsConsultingExpert(promptIndex);
    setToast({ message: 'Consulting prompt expert...', type: 'success' });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Step 1: Get the improved prompt
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

        // Step 2: Analyze the new prompt for required tools
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
        
        let requiredTools: string[] = [];
        try {
            const jsonMatch = toolsResponse.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                requiredTools = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Could not parse tool analysis response:", toolsResponse.text);
        }

        // Step 3: Update state to reflect the suggestion
        setEditedPrompts(prev => ({
            ...prev,
            [promptIndex]: `\`${improvedPrompt.replace(/`/g, '\\`')}\``,
        }));
        
        if (requiredTools.length > 0) {
            setPendingToolUpdates(prev => ({
                ...prev,
                [promptIndex]: requiredTools
            }));
             setToast({ message: 'Expert feedback applied. A tool configuration update is pending your save.', type: 'success' });
        } else {
            // If there were pending tool updates but the new prompt doesn't need them, clear them.
            if(pendingToolUpdates[promptIndex]){
              const newPending = { ...pendingToolUpdates };
              delete newPending[promptIndex];
              setPendingToolUpdates(newPending);
            }
            setToast({ message: 'Expert feedback applied. Review and save the changes.', type: 'success' });
        }

    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setToast({ message: `Failed to get expert feedback: ${message}`, type: 'error' });
    } finally {
        setIsConsultingExpert(null);
    }
  }, [originalPrompts, editedPrompts, pendingToolUpdates]);


  const handleScaffoldArgs = useCallback(async () => {
    if (!selectedFunction) {
      setToast({ message: 'Please select a function first.', type: 'error' });
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
        setToast({ message: 'Arguments scaffolded successfully. Please fill in the placeholder values.', type: 'success' });
      } catch (e) {
        throw new Error("The AI generated invalid JSON. Please try again or enter it manually.");
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred while generating arguments.';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsGeneratingArgs(false);
    }
  }, [selectedFunction]);

  const handleExecute = useCallback(async () => {
    if (!processedFileContent || !selectedFunction) {
      setError("Please load a file and select a function to execute.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setExecutionLogs([]);
    setExecutionStatus('Initializing...');
    setExecutedInputFileUrl(null);

    let inputFileDataUrl: string | null = null;
    if (inputFile) {
      setExecutionStatus('Reading attached file...');
      const promise = new Promise<string>((resolve, reject) => {
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
        log: (...args: any[]) => {
            setExecutionLogs(prev => [...prev, `[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`]);
            originalConsole.log.apply(originalConsole, args);
        },
        error: (...args: any[]) => {
            const formattedError = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object' && a !== null) return JSON.stringify(a, null, 2);
                return String(a);
            }).join(' ');
            setExecutionLogs(prev => [...prev, `[ERROR] ${formattedError}`]);
            originalConsole.error.apply(originalConsole, args);
        },
        warn: (...args: any[]) => {
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
      // Dynamically replace prompts if they've been edited for this execution run
      if (Object.keys(editedPrompts).length > 0 && originalPrompts.length > 0) {
          setExecutionStatus('Applying unsaved prompt edits for this trial execution...');
          
          originalPrompts.forEach((originalPrompt: string, index: number) => {
              const editedPrompt = editedPrompts[index];
              if (editedPrompt && editedPrompt !== originalPrompt) {
                  // Replace the first occurrence of the original prompt with the edited one.
                  codeToExecute = codeToExecute.replace(originalPrompt, editedPrompt);
              }
          });
      }


      let userModule: any;
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
            get: (target: any, prop: any, receiver: any) => {
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
        
        const requirePolyfill = (moduleName: string) => {
            if (moduleName === '@google/genai') {
              if (isDebugMode) {
                newConsole.log('[LOG] [Workbench] Intercepting "@google/genai" to add API call logging.');
                const originalGenAIModule = GoogleGenAIModule;
            
                const modelsProxyHandler = {
                    get(target: any, prop: string | symbol, receiver: any) {
                        const originalMethod = target[prop];
                        if (prop === 'generateContent' && typeof originalMethod === 'function') {
                            return async function(...args: any[]) {
                                const request = args[0] || {};
                                // To avoid logging huge base64 strings, we create a "loggable" version of the request.
                                const loggableRequest = JSON.parse(JSON.stringify(request));
                                if (loggableRequest.contents?.parts) {
                                    loggableRequest.contents.parts = loggableRequest.contents.parts.map((part: any) => {
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
                    construct(target: any, args: any[]) {
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
                    accessSecretVersion(request: { name?: string }) {
                        newConsole.log(`[LOG] [Workbench] Mock SecretManagerServiceClient.accessSecretVersion called with name: "${request.name}".`);
                        
                        const expectedSecretName = 'projects/workbench-mock/secrets/GEMINI_API_KEY/versions/latest';
                        if (request.name !== expectedSecretName) {
                            newConsole.error(`[ERROR] [Workbench] Mock secret manager received an unexpected secret name. Expected "${expectedSecretName}", but got "${request.name}".`);
                            const err = new Error(`Secret with name ${request.name} not found in mock.`);
                            (err as any).code = 5; // Mimic gRPC NOT_FOUND code
                            return Promise.reject(err);
                        }

                        const mockVersion = {
                            payload: {
                                data: {
                                    toString: (encoding: string = 'utf8') => {
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

            const handler: ProxyHandler<any> = {
                get: function(target: any, prop: any, receiver: any) {
                    newConsole.warn(`[WARN] [Workbench] Mocked module "${moduleName}": Accessed property "${String(prop)}". Returning a mock function.`);
                    return new Proxy(function() {}, handler);
                },
                apply: function(target: any, thisArg: any, argumentsList: any) {
                    newConsole.warn(`[WARN] [Workbench] Mocked module "${moduleName}": Called as a function.`);
                    return new Proxy(function() {}, handler);
                },
                construct: function(target: any, args: any) {
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
      
      let argsForExecution: any;
      let parsedArgs: any = {};
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
      let resultText: string;
      if (typeof result === 'object' && result !== null) {
          resultText = 'text' in result ? String(result.text) : JSON.stringify(result, null, 2);
      } else {
          resultText = String(result);
      }
      
      const sources = (typeof result === 'object' && result !== null && 'sources' in result) ? result.sources as any[] : undefined;

      setResponse({ text: resultText, sources });

    } catch (err) {
      let errorMessage = 'An unknown execution error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;

        const errorDetails = (err as any).cause || (err as any).response;
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3">
          <BotIcon className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-50">Jules Gemini Function Workbench</h1>
            <p className="text-sm text-slate-400">Test your deployed Gemini functions in an isolated environment.</p>
          </div>
          <div className="flex-grow"></div>
          <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".js,.ts"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileProcessing}
                className="flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait w-48"
            >
                {isFileProcessing ? (
                    <Fragment>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                    </Fragment>
                ) : (
                    <Fragment>
                        <UploadIcon className="w-5 h-5" />
                        <span>{fileName ? `Loaded: ${fileName}` : 'Load Service File'}</span>
                    </Fragment>
                )}
            </button>
            <button
                onClick={handleExportFile}
                disabled={!processedFileContent || isFileProcessing}
                className="flex items-center gap-2 bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon className="w-5 h-5" />
                <span>Download Updated File</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <FunctionRunner
          isLoading={isLoading}
          onExecute={handleExecute}
          availableFunctions={availableFunctions}
          selectedFunction={selectedFunction}
          setSelectedFunction={setSelectedFunction}
          isGeneratingArgs={isGeneratingArgs}
          onScaffoldArgs={handleScaffoldArgs}
          functionArgs={functionArgs}
          setFunctionArgs={setFunctionArgs}
          inputFile={inputFile}
          setInputFile={setInputFile}
          hasFileLoaded={!!processedFileContent}
          timeoutDuration={timeoutDuration}
          setTimeoutDuration={setTimeoutDuration}
          isDebugMode={isDebugMode}
          setIsDebugMode={setIsDebugMode}
          originalCode={fileContent}
          patchedCode={processedFileContent}
          originalPrompts={originalPrompts}
          editedPrompts={editedPrompts}
          setEditedPrompts={setEditedPrompts}
          onSavePrompt={handlePromptSave}
          onDiscardPrompt={handlePromptDiscard}
          isConsultingExpert={isConsultingExpert}
          onConsultExpert={handleConsultExpert}
          pendingToolUpdates={pendingToolUpdates}
        />
        <ResponseViewer
          response={response?.text ?? ''}
          sources={response?.sources}
          isLoading={isLoading}
          error={error}
          statusMessage={executionStatus}
          logs={executionLogs}
          imageUrl={executedInputFileUrl}
        />
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
