
import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PromptEditor } from './PromptEditor';
import { BotIcon } from './icons/BotIcon';
import { CodeIcon } from './icons/CodeIcon';

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
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="function-select" className="block text-sm font-medium text-slate-400 mb-2">
          Exported Function
        </label>
        <select
          id="function-select"
          value={selectedFunction}
          onChange={(e) => setSelectedFunction(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          disabled={isLoading || isGeneratingArgs || availableFunctions.length === 0}
        >
          {availableFunctions.length > 0 ? (
            availableFunctions.map(fn => <option key={fn} value={fn}>{fn}</option>)
          ) : (
            <option>No functions found in file</option>
          )}
        </select>
      </div>

      <button
        onClick={onScaffoldArgs}
        disabled={isLoading || isGeneratingArgs || !selectedFunction}
        className="w-full flex items-center justify-center gap-2 bg-slate-600 text-slate-100 font-semibold py-2 px-4 rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isGeneratingArgs ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Scaffolding...
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5 text-cyan-400" />
            Scaffold Arguments
          </>
        )}
      </button>

      <div className="relative">
        <label htmlFor="function-args" className="block text-sm font-medium text-slate-400 mb-2">
          Arguments (JSON)
        </label>
        <textarea
          id="function-args"
          rows={5}
          className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition font-mono text-sm"
          placeholder={`{\n  "key": "value"\n}`}
          value={functionArgs}
          onChange={(e) => setFunctionArgs(e.target.value)}
          disabled={isLoading || isGeneratingArgs}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="file-input" className="block text-sm font-medium text-slate-400 mb-2">
          Attach File (Optional)
        </label>
        <div className="relative flex-grow min-h-[100px] flex items-center justify-center w-full">
          <input
            type="file"
            id="file-input"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileChange}
            disabled={isLoading || isGeneratingArgs}
          />
          <div className="flex flex-col items-center justify-center p-5 text-center border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg w-full h-full transition-colors">
            {inputFile ? (
              <div className="flex flex-col items-center gap-2 relative z-0">
                {previewUrl ? (
                  <img src={previewUrl} alt="File preview" className="max-h-24 max-w-full object-contain rounded-md mb-2" />
                ) : (
                  <UploadIcon className="w-8 h-8 text-slate-500" />
                )}
                <p className="font-semibold text-slate-300 truncate max-w-xs">{inputFile.name}</p>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInputFile(null); }}
                  className="mt-1 text-xs text-red-400 hover:underline relative z-20"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <UploadIcon className="w-8 h-8 text-slate-500 mb-2" />
                <p className="font-semibold text-slate-300">Click to upload</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-md border border-slate-700">
        <label htmlFor="debug-mode-toggle" className="flex flex-col cursor-pointer flex-grow pr-4">
          <span className="text-sm font-medium text-slate-300">Debug Mode</span>
          <span className="text-xs text-slate-500">Log API calls and env access.</span>
        </label>
        <div className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="debug-mode-toggle"
            className="sr-only peer"
            checked={isDebugMode}
            onChange={(e) => setIsDebugMode(e.target.checked)}
            disabled={isLoading}
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </div>
      </div>

      <div>
        <label htmlFor="timeout-input" className="block text-sm font-medium text-slate-400 mb-2">
          Execution Timeout (seconds)
        </label>
        <input
          type="number"
          id="timeout-input"
          value={timeoutDuration}
          onChange={(e) => setTimeoutDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          min="1"
          disabled={isLoading || isGeneratingArgs}
        />
      </div>

      <button
        onClick={onExecute}
        disabled={isLoading || isGeneratingArgs || !selectedFunction}
        className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 mt-auto"
      >
        {isLoading ? 'Executing...' : 'Execute Function'}
      </button>
    </div>
  );
}


export const FunctionRunner: React.FC<FunctionRunnerProps> = (props) => {
  const [activeTab, setActiveTab] = useState<RunnerTab>('runner');

  useEffect(() => {
    // When a new file is loaded, switch back to the runner tab.
    if (props.hasFileLoaded) {
      setActiveTab('runner');
    }
  }, [props.hasFileLoaded, props.originalCode]);


  if (!props.hasFileLoaded) {
    return (
        <div className="bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 p-6 flex flex-col items-center justify-center gap-4 text-center h-full">
            <div className="bg-slate-700 p-3 rounded-full">
                <UploadIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Start by loading your service file</h2>
            <p className="text-sm text-slate-400 max-w-sm">Click the "Load Service File" button in the header to upload your `.js` file and discover its exported functions.</p>
        </div>
    );
  }

  const getTabClassName = (tab: RunnerTab) => {
    const isActive = activeTab === tab;
    return `flex items-center gap-2 relative py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 rounded-t-md
      ${isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'}`;
  };

  const ActiveTabIndicator = () => <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full">
      <div className="px-4 border-b border-slate-700">
        <div className="flex items-center -mb-px">
            <button className={getTabClassName('runner')} onClick={() => setActiveTab('runner')}>
                <SparklesIcon className="w-4 h-4" /> Runner
                {activeTab === 'runner' && <ActiveTabIndicator />}
            </button>
            <button className={getTabClassName('code')} onClick={() => setActiveTab('code')}>
                <CodeIcon className="w-4 h-4" /> Code
                {activeTab === 'code' && <ActiveTabIndicator />}
            </button>
            <button className={getTabClassName('prompts')} onClick={() => setActiveTab('prompts')}>
                <BotIcon className="w-4 h-4" /> Prompts
                {activeTab === 'prompts' && <ActiveTabIndicator />}
            </button>
        </div>
      </div>
      
      <div className="p-6 flex-grow overflow-auto bg-slate-900/20">
        {activeTab === 'runner' && <RunnerControls {...props} />}
        {activeTab === 'code' && (
            <div className="grid grid-cols-2 gap-4 h-full">
                <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Original Uploaded Code</h3>
                    <pre className="text-xs bg-slate-900 p-3 rounded-md h-[calc(100%-2rem)] overflow-auto font-mono">{props.originalCode || 'No file loaded'}</pre>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Live Code (Executable)</h3>
                    <pre className="text-xs bg-slate-900 p-3 rounded-md h-[calc(100%-2rem)] overflow-auto font-mono">{props.patchedCode || 'No file loaded'}</pre>
                </div>
            </div>
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
      </div>
    </div>
  );
};
