export function getInitials(name) {
  if (!name || typeof name !== 'string') return '??';

  name = name.trim();
  if (name.length === 0) return '??';

  const firstChar = name[0].toUpperCase();
  const spaceIndex = name.indexOf(' ');

  if (spaceIndex !== -1 && spaceIndex + 1 < name.length) {
    const secondChar = name[spaceIndex + 1].toUpperCase();
    // Skip multiple spaces if any
    if (secondChar !== ' ') {
        return firstChar + secondChar;
    }

    // Find next non-space char
    for (let i = spaceIndex + 1; i < name.length; i++) {
        if (name[i] !== ' ') {
            return firstChar + name[i].toUpperCase();
        }
    }
  }

  return firstChar;
}
