
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { BotIcon } from './icons/BotIcon';

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
    return <p className="text-slate-500 text-sm">No significant string literals (prompts) found in the selected function.</p>;
  }

  return (
    <div className="space-y-6">
      {originalPrompts.map((prompt, index) => {
        const editedPrompt = editedPrompts[index];
        const isDirty = editedPrompt !== undefined && editedPrompt !== prompt;
        const hasPendingToolUpdate = pendingToolUpdates[index] && pendingToolUpdates[index].length > 0;

        return (
          <div key={index}>
            <label htmlFor={`prompt-editor-${index}`} className="block text-sm font-medium text-slate-400 mb-2">
              Extracted Prompt #{index + 1}
            </label>
            <textarea
              id={`prompt-editor-${index}`}
              value={editedPrompt ?? prompt}
              onChange={(e) => handlePromptChange(index, e.target.value)}
              rows={8}
              className={`w-full bg-slate-900 border rounded-md shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition font-mono text-sm ${isDirty ? 'border-cyan-600' : 'border-slate-600'}`}
              disabled={isConsultingExpert === index}
            />
            <div className="flex items-center justify-end gap-3 mt-2">
               <button
                onClick={() => onConsultExpert(index)}
                disabled={isConsultingExpert !== null}
                className="flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
                aria-label="Consult prompt expert for feedback"
              >
                {isConsultingExpert === index ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Consulting...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Consult Expert</span>
                  </>
                )}
              </button>

              <div className="w-px h-4 bg-slate-600"></div>

              <button
                onClick={() => onDiscardPrompt(index)}
                disabled={!isDirty || isConsultingExpert !== null}
                className="text-sm font-medium text-slate-400 hover:text-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed transition"
                aria-label="Discard changes for this prompt"
              >
                Discard
              </button>
              <button
                onClick={() => onSavePrompt(index)}
                disabled={!isDirty || isConsultingExpert !== null}
                className="flex items-center gap-2 text-sm font-semibold bg-cyan-600 text-white py-1 px-3 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                aria-label="Save changes for this prompt"
              >
                <span>Save Changes</span>
                {hasPendingToolUpdate && (
                  <span className="flex items-center gap-1 text-xs text-cyan-200" title={`Will update tools to: ${pendingToolUpdates[index].join(', ')}`}>
                     <BotIcon className="w-3 h-3"/> (+ Tools)
                  </span>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
