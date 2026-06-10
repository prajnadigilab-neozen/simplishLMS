const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

async function main() {
    try {
        console.log('Reading FINAL_GRADUATION_EXAM.json...');
        const jsonPath = path.join(__dirname, '..', '..', 'FINAL_GRADUATION_EXAM.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.error(`Error: File not found at ${jsonPath}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const examData = JSON.parse(rawData);

        console.log('Connecting to Supabase to find Final Graduation Exam lesson...');

        // Query lessons to find if there is already a Final Graduation Exam
        const { data: lessons, error: fetchError } = await supabase
            .from('lessons')
            .select('*');

        if (fetchError) {
            throw fetchError;
        }

        // Match by content.isFinal or title
        let matchedLesson = lessons.find(l => l.content && l.content.isFinal === true);
        if (!matchedLesson) {
            matchedLesson = lessons.find(l => l.title && l.title.toLowerCase().includes('final graduation exam'));
        }

        if (matchedLesson) {
            console.log(`Found existing lesson: "${matchedLesson.title}" (ID: ${matchedLesson.id}). Updating content...`);
            
            const { data: updated, error: updateError } = await supabase
                .from('lessons')
                .update({ content: examData })
                .eq('id', matchedLesson.id)
                .select();

            if (updateError) {
                throw updateError;
            }

            console.log('✅ Final Graduation Exam content updated successfully in database!');
            console.log('Updated Lesson:', updated[0]);
        } else {
            console.log('No existing Final Graduation Exam found. Inserting a new lesson...');
            
            const insertPayload = {
                title: 'Final Graduation Exam',
                description: 'The ultimate final exam to test your overall competency in SIMPLISH.',
                level: 'Expert',
                media_type: 'mixed',
                content: examData,
                display_order: 100 // Final exam is last
            };

            const { data: inserted, error: insertError } = await supabase
                .from('lessons')
                .insert(insertPayload)
                .select();

            if (insertError) {
                throw insertError;
            }

            console.log('✅ Created new Final Graduation Exam in database!');
            console.log('Inserted Lesson:', inserted[0]);
        }
    } catch (err) {
        console.error('Fatal error updating final exam content:', err);
        process.exit(1);
    }
}

main();
