const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('Starting Migration V13: exam_feedback...');
    
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migration_v13_exam_feedback.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing SQL file against PostgreSQL...');
        await db.query(sql);
        console.log('✅ Migration V13 executed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        // Close pool to allow script to exit
        db.pool.end();
    }
}

runMigration();
