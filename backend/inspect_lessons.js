const fs = require('fs');
const content = fs.readFileSync('lessons_dump.json', 'utf16le');
// Find the first '[' and last ']' to extract purely the JSON if there's trash around it
const firstBracket = content.indexOf('[');
const lastBracket = content.lastIndexOf(']');
if (firstBracket !== -1 && lastBracket !== -1) {
    const jsonStr = content.substring(firstBracket, lastBracket + 1);
    try {
        const data = JSON.parse(jsonStr);
        console.log(JSON.stringify(data.slice(0, 5), null, 2));
    } catch (e) {
        console.error('Error parsing JSON:', e.message);
        console.log('Partial content:', content.substring(0, 100));
    }
} else {
    console.log('No JSON array found in file.');
}
