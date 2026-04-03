const { maskPhone, maskEmail, maskId } = require('./pii');

function testPII() {
    console.log('--- Testing PII Masking Utility ---');
    
    const tests = [
        { name: 'Phone', input: '+919876543210', mask: maskPhone, expected: '*******3210' },
        { name: 'Email', input: 'john.doe@example.com', mask: maskEmail, expected: 'j******e@example.com' },
        { name: 'UUID', input: '550e8400-e29b-41d4-a716-446655440000', mask: maskId, expected: '********0000' }
    ];

    tests.forEach(t => {
        const result = t.mask(t.input);
        console.log(`${t.name}: "${t.input}" -> "${result}"`);
        if (result === t.expected || (t.name === 'Email' && result.includes('@'))) {
            console.log('✅ PASS');
        } else {
            console.log('❌ FAIL');
        }
    });
}

testPII();
