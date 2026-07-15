const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('Starting Migration V16: discounts...');
    
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migration_v16_discounts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing SQL file against PostgreSQL...');
        await db.query(sql);
        console.log('✅ Migration V16 executed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        db.pool.end();
    }
}

runMigration();
