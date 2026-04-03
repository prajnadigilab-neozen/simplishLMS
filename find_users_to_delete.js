const supabase = require('./backend/config/supabase');
const fs = require('fs');

const phones = [
    '8414259539',
    '8648939644',
    '8712672934',
    '8208439511',
    '8765987654',
    '9999988888'
];

async function findUsers() {
    let results = '--- SEARCHING FOR USERS ---\n';
    for (const phone of phones) {
        const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('id, full_name, phone')
            .or(`phone.eq.${phone},phone.eq.+91${phone}`);

        if (publicError) {
            results += `Error searching ${phone}: ${publicError.message}\n`;
            continue;
        }

        if (publicUser && publicUser.length > 0) {
            publicUser.forEach(u => {
                results += `FOUND: [${u.id}] ${u.full_name} (${u.phone})\n`;
            });
        } else {
            results += `NOT FOUND: ${phone}\n`;
        }
    }
    fs.writeFileSync('found_users.txt', results);
    console.log('Results written to found_users.txt');
}

findUsers();
