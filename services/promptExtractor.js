import { getFunctionBody } from "./codeUtilities.js";

/**
 * Extracts long, multi-line template literals from a function's body.
 * These are assumed to be prompts for the Gemini API.
 * @param fullCode The full source code content.
 * @param functionName The name of the function to search within.
 * @returns An array of extracted prompt strings.
 */
export function extractPromptsFromFunction(fullCode, functionName) {
  const functionBody = getFunctionBody(fullCode, functionName);
  if (!functionBody) {
    return [];
  }

  const prompts = [];
  // This more robust regex correctly handles template literals that may contain backticks
  // inside the string content by matching either an escaped backtick or any character that is not a backtick.
  // This prevents it from prematurely ending the match on internal backticks.
  const promptRegex = /`((?:\\`|[^`])*)`/g;

  let match;
  while ((match = promptRegex.exec(functionBody)) !== null) {
    const promptText = match[0];
    // A simple heuristic: consider it a "prompt" if it contains newlines and is of a significant length.
    // This prevents capturing small template literals used for formatting.
    // The previous check for '\\n' was incorrect; it should check for the newline character '\n'.
    if (promptText.includes('\n') && promptText.length > 100) {
      prompts.push(promptText);
    }
  }

  return prompts;
}
