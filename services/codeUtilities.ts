
/**
 * Finds the body of a specific exported function within a string of code.
 * This is a simplified parser and might not cover all edge cases, but is
 * robust enough for the common function declaration styles in the workbench.
 * @param code The full source code.
 * @param functionName The name of the function to find.
 * @returns The source code of the function's body, or null if not found.
 */
export function getFunctionBody(code: string, functionName: string): string | null {
  // Regex to find function declarations, including async, const assignments, etc.
  // It looks for patterns like 'export function funcName(', 'const funcName = (', 'const funcName = async (', etc.
  const functionRegex = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?(?:function\\s+${functionName}|(?:const|let|var)\\s+${functionName}\\s*=\\s*(?:async)?)\\s*\\(`,
    'g'
  );

  const match = functionRegex.exec(code);
  if (!match) return null;

  const startIndex = match.index;
  let openBraces = 0;
  let functionBodyStartIndex = -1;

  // Find the start of the function body (the first '{' after the signature)
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      functionBodyStartIndex = i;
      break;
    }
  }

  if (functionBodyStartIndex === -1) return null;

  // Find the end of the function body by matching braces
  for (let i = functionBodyStartIndex; i < code.length; i++) {
    if (code[i] === '{') {
      openBraces++;
    } else if (code[i] === '}') {
      openBraces--;
    }
    if (openBraces > 0 && i === code.length - 1) {
        // Reached end of file with unmatched braces
        return null;
    }
    if (openBraces === 0 && functionBodyStartIndex !== i) {
      return code.substring(functionBodyStartIndex, i + 1);
    }
  }

  return null; // Should not be reached if braces are balanced
}
