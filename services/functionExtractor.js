export function extractExportedFunctionNames(content) {
  const names = new Set();
  let match;

  // ES Modules: `export function...`, `export const...`, `export {...}`
  const esmRegex = /export\s+(?:(?:async\s+)?function\s+(\w+)|const\s+([\w\s,{}=]+?)\s*=|var\s+([\w\s,{}=]+?)\s*=|let\s+([\w\s,{}=]+?)\s*=|{([^}]+)})/g;
  while ((match = esmRegex.exec(content)) !== null) {
    if (match[1]) { // export function functionName
      names.add(match[1]);
    } else if (match[2] || match[3] || match[4]) { // export const/var/let name = ...
      const declaration = (match[2] || match[3] || match[4]).split('=')[0];
      declaration.replace(/[{}]/g, '').split(',').forEach(name => {
        const trimmedName = name.trim();
        if (trimmedName && !trimmedName.includes(':')) {
          names.add(trimmedName);
        }
      });
    } else if (match[5]) { // export { name1, name2 }
        match[5].split(',').forEach(name => {
            const trimmedName = name.split(' as ')[0].trim();
            if(trimmedName) names.add(trimmedName);
        });
    }
  }

  // CommonJS: `exports.name = ...` or `module.exports.name = ...`
  const cjsMemberRegex = /(?:module\.)?exports\.([a-zA-Z0-9_$]+)\s*=/g;
  while ((match = cjsMemberRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  // CommonJS: `module.exports = { ... }`
  const cjsObjectRegex = /module\.exports\s*=\s*{([\s\S]*?)}/;
  const cjsObjectMatch = content.match(cjsObjectRegex);
  if (cjsObjectMatch && cjsObjectMatch[1]) {
    const objectContent = cjsObjectMatch[1];
    // This logic splits by comma and handles both `key: value` and `shorthand` properties.
    objectContent.split(',').forEach(part => {
        part = part.trim();
        if (!part) return;

        // Use the part before the colon for key:value pairs, or the whole part for shorthand.
        const key = part.split(':')[0].trim();
        // remove potential quotes from keys
        const cleanKey = key.replace(/^['"`]|['"`]$/g, '');

        if (cleanKey && /^[a-zA-Z0-9_$]+$/.test(cleanKey)) {
            names.add(cleanKey);
        }
    });
  }

  return Array.from(names);
}
