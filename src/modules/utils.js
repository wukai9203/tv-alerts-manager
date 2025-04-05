// Escape HTML special characters and handle JSON strings
export function tryParseJSONString(str) {
    if (!str) return '';
    // Remove tabs and newlines
    str = str.replace(/[\t\n]/g, '');
    try {
        // Try to parse as JSON
        return JSON.parse(str);
    } catch (e) {
        // If not JSON, return the original string
        return str;
    }
}