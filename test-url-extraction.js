// Test URL extraction
function extractListIdFromUrl(url) {
    try {
        // Match patterns like: /v/l/rf3me-17585 or /v/l/123456
        const match = url.match(/\/v\/l\/([^/?]+)/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}

// Test cases
const testUrls = [
    'https://app.clickup.com/25661070/v/l/rf3me-17585?pr=90080284723',
    'https://app.clickup.com/12345678/v/l/90123456',
    'https://app.clickup.com/team/v/l/abc-123',
    'https://app.clickup.com/invalid/url'
];

console.log('URL Extraction Test Results:');
console.log('============================');

testUrls.forEach(url => {
    const listId = extractListIdFromUrl(url);
    console.log(`URL: ${url}`);
    console.log(`List ID: ${listId || 'NOT FOUND'}`);
    console.log('---');
});

// Your specific URL
const yourUrl = 'https://app.clickup.com/25661070/v/l/rf3me-17585?pr=90080284723';
const yourListId = extractListIdFromUrl(yourUrl);
console.log(`\n🎯 YOUR LIST ID: ${yourListId}`);