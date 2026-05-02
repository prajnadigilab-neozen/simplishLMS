import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle2, XCircle, Loader2, ArrowLeft, Plus, HelpCircle, Edit, Trash2, Wand2, Sparkles } from 'lucide-react';
import { lessonApi, assessmentApi, aiApi } from '../utils/api';

const LessonCreate = ({ lesson, onBack }) => {
    const [currentTab, setCurrentTab] = useState('ai-gen'); // 'ai-gen', 'details', 'study', 'reading', 'vocabulary', 'media', 'questions'
    const [formData, setFormData] = useState({
        title: '',
        level: 'Basic',
        description: '',
        transcription: '',
        displayOrder: 1,
        moduleTitle: '',
        unitNumber: 1,
        content: null,
        isExam: false,
        isFinal: false
    });

    // Sub-states for various sections
    // Sub-states for various sections as raw JSON strings for easier editing
    const [studyContentRaw, setStudyContentRaw] = useState('');
    const [evolutionContentRaw, setEvolutionContentRaw] = useState('');
    const [readingContentRaw, setReadingContentRaw] = useState('');
    const [vocabularyContentRaw, setVocabularyContentRaw] = useState('');
    const [files, setFiles] = useState({ pdf: null, audio: null, video: null });
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: '', type: 'Text', correct_answer: '', points: 10, options: '', explanation: '' });
    const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);

    // AI Generation State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiEngine, setAiEngine] = useState('gemini-2.5-flash');
    const [generating, setGenerating] = useState(false);
    const [generatedContentPreview, setGeneratedContentPreview] = useState('');

    useEffect(() => {
        // Reset form state whenever the lesson prop changes
        setStatus('idle');
        setMessage('');
        setQuestions([]);
        setCurrentTab('ai-gen');

        if (lesson) {
            setFormData({
                title: lesson.title || '',
                level: lesson.level || 'Basic',
                description: lesson.description || '',
                transcription: lesson.transcription || '',
                displayOrder: lesson.display_order || 1,
                moduleTitle: lesson.module_title || '',
                unitNumber: lesson.unit_number || 1,
                content: lesson.content || null,
                isExam: lesson.content?.isExam || false,
                isFinal: lesson.content?.isFinal || false
            });
            // Populate sub-states
            const content = lesson.content || {};
            setStudyContentRaw(content.logicContent?.length > 0 ? JSON.stringify(content.logicContent, null, 2) : '');
            setEvolutionContentRaw(content.evolutionContent?.length > 0 ? JSON.stringify(content.evolutionContent, null, 2) : '');
            setReadingContentRaw(content.readingContent?.length > 0 ? JSON.stringify(content.readingContent, null, 2) : '');
            setVocabularyContentRaw(content.vocabularyContent?.length > 0 ? JSON.stringify(content.vocabularyContent, null, 2) : '');
            setQuestions(lesson.questions || content.milestoneTest || []);
            setFiles({ pdf: null, audio: null, video: null });
            if (lesson.content) {
                setGeneratedContentPreview(JSON.stringify(lesson.content, null, 2));
            } else {
                setGeneratedContentPreview('');
            }
            fetchQuestions(lesson.id);
        } else {
            // Reset to blank form for new lesson
            setFormData({
                title: '',
                level: 'Basic',
                description: '',
                transcription: '',
                displayOrder: 1,
                moduleTitle: '',
                unitNumber: 1,
                content: null,
                isExam: false,
                isFinal: false
            });
            setGeneratedContentPreview('');
            setAiPrompt('');
            setStudyContentRaw('');
            setEvolutionContentRaw('');
            setReadingContentRaw('');
            setVocabularyContentRaw('');
            setFiles({ pdf: null, audio: null, video: null });
        }
    }, [lesson]);

    const fetchQuestions = async (lessonId) => {
        setLoadingQuestions(true);
        try {
            const res = await assessmentApi.getByLesson(lessonId);
            const fetchedQuestions = res.data.questions || [];
            setQuestions(fetchedQuestions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type,
                correct_answer: q.correct_answer,
                points: q.points || 10,
                options: q.options || [],
                explanation: q.explanation || ''
            })));
        } catch (err) {
            console.warn("No assessment found for this lesson yet.");
            setQuestions([]);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleAddQuestion = () => {
        if (!newQuestion.text || !newQuestion.correct_answer) {
            alert('ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಮತ್ತು ಸರಿಯಾದ ಉತ್ತರವನ್ನು ಭರ್ತಿ ಮಾಡಿ (Please fill in both Question Text and Correct Answer)');
            return;
        }

        const preparedQuestion = {
            ...newQuestion,
            options: newQuestion.type === 'MCQ'
                ? newQuestion.options.split(',').map(o => o.trim()).filter(o => o !== '')
                : null
        };

        if (editingQuestionIdx !== null) {
            const updated = [...questions];
            updated[editingQuestionIdx] = preparedQuestion;
            setQuestions(updated);
            setEditingQuestionIdx(null);
        } else {
            setQuestions([...questions, preparedQuestion]);
        }
        setNewQuestion({ text: '', type: 'Text', correct_answer: '', points: 10, options: '', explanation: '' });
    };

    const handleEditQuestion = (index) => {
        const q = questions[index];
        setNewQuestion({
            ...q,
            options: Array.isArray(q.options) ? q.options.join(', ') : (q.options || '')
        });
        setEditingQuestionIdx(index);
    };

    const handleDeleteQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setStatus('loading');

        try {
            // 0. Parse and Bundle all content sections
            let finalLogic, finalEvolution, finalReading, finalVocabulary;
            try {
                finalLogic = studyContentRaw.trim() ? JSON.parse(studyContentRaw) : [];
            } catch (pErr) { throw new Error("Study Logic (Magic Shift) contains invalid JSON format."); }

            try {
                finalEvolution = evolutionContentRaw.trim() ? JSON.parse(evolutionContentRaw) : [];
            } catch (pErr) { throw new Error("Sentence Evolution Steps contains invalid JSON format."); }

            try {
                finalReading = readingContentRaw.trim() ? JSON.parse(readingContentRaw) : [];
            } catch (pErr) { throw new Error("Reading Lab Content contains invalid JSON format."); }

            try {
                finalVocabulary = vocabularyContentRaw.trim() ? JSON.parse(vocabularyContentRaw) : [];
            } catch (pErr) { throw new Error("Vocabulary & Mnemonics contains invalid JSON format."); }

            const lessonContent = {
                logicContent: finalLogic,
                evolutionContent: finalEvolution,
                readingContent: finalReading,
                vocabularyContent: finalVocabulary,
                milestoneTest: questions,
                isExam: formData.isExam,
                isFinal: formData.isFinal
            };

            // 1. Save/Update Lesson
            const data = new FormData();
            data.append('title', formData.title);
            data.append('level', formData.level);
            data.append('description', formData.description);
            data.append('displayOrder', formData.displayOrder);
            data.append('moduleTitle', formData.moduleTitle);
            data.append('unitNumber', formData.unitNumber);
            data.append('transcription', formData.transcription);
            data.append('content', JSON.stringify(lessonContent));

            if (files.pdf) data.append('pdf', files.pdf);
            if (files.audio) data.append('audio', files.audio);
            if (files.video) data.append('video', files.video);

            let lessonId;
            if (lesson) {
                lessonId = lesson.id;
                await lessonApi.update(lesson.id, data);
            } else {
                const res = await lessonApi.upload(data);
                lessonId = res.data?.lesson?.id || res.data?.id;

                if (!lessonId) {
                    throw new Error("Failed to retrieve new Lesson ID from server response.");
                }
            }

            // 2. Save/Update Questions (Assessment)
            // Even if empty, we might want to "sync" to clear questions if they were deleted
            await assessmentApi.upsertQuestions(lessonId, questions);

            setMessage(lesson ? 'Lesson & Questions updated!' : 'Lesson & Questions saved!');
            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                onBack();
            }, 1500);
        } catch (err) {
            console.error('Detailed Save Error:', err);
            console.error('Error config URL:', err?.config?.url);
            console.error('Error response data:', err?.response?.data);
            setStatus('error');
            setMessage(`Failed to save. ${err?.response?.data?.message || err.message}`);
        }
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const newQuestions = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const row = line.match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]+))/g);
                if (!row || row.length < 3) continue;

                const cleanRow = row.map(cell => {
                    let c = cell.trim();
                    if (c.endsWith(',')) c = c.slice(0, -1).trim();
                    if (c.startsWith('"') && c.endsWith('"')) c = c.slice(1, -1).replace(/""/g, '"');
                    return c;
                });

                const type = cleanRow[0] || 'Text';
                const textQ = cleanRow[1] || '';
                const options = [];
                if (cleanRow[2]) options.push(cleanRow[2]);
                if (cleanRow[3]) options.push(cleanRow[3]);
                if (cleanRow[4]) options.push(cleanRow[4]);
                if (cleanRow[5]) options.push(cleanRow[5]);

                const correct_answer = cleanRow[6] || cleanRow[2] || '';
                const points = parseInt(cleanRow[7]) || 10;
                const explanation = cleanRow[8] || '';

                if (textQ && correct_answer) {
                    newQuestions.push({
                        text: textQ,
                        type,
                        options: type === 'MCQ' ? options : null,
                        correct_answer,
                        points,
                        explanation
                    });
                }
            }
            if (newQuestions.length > 0) {
                setQuestions(prev => [...prev, ...newQuestions]);
                alert(`Successfully imported ${newQuestions.length} questions.`);
            } else {
                alert('No valid questions found in CSV.');
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const prefillFormFromJSON = (json) => {
        // Handle hierarchical metadata and content
        const metadata = json.lesson_metadata || json.course_metadata || {};
        const content = json.section_1_lesson_content || json.lesson_content || json;

        const levelMap = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert', 'Basic': 'Basic', 'Intermediate': 'Intermediate', 'Advanced': 'Advanced', 'Expert': 'Expert' };

        // 1. Basic Details
        const rawLevel = metadata.level || json.level || 'Basic';
        // Normalize level (e.g. "Basic (ಬುನಾಡಿ)" -> "Basic")
        let normalizedLevel = 'Basic';
        if (typeof rawLevel === 'string') {
            const match = rawLevel.match(/(Basic|Intermediate|Advanced|Expert)/i);
            if (match) {
                normalizedLevel = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
            }
        } else if (levelMap[rawLevel]) {
            normalizedLevel = levelMap[rawLevel];
        }

        setFormData(prev => ({
            ...prev,
            title: metadata.lesson_topic_english || metadata.topic || json.title || prev.title,
            level: normalizedLevel,
            moduleTitle: metadata.module_title || json.module_title || 'General',
            unitNumber: json.unit_number || 1,
            description: content.logic_explanation?.content || content.explanation?.kannada || json.description || prev.description,
            transcription: (content.listening_lab?.script && Array.isArray(content.listening_lab.script))
                ? content.listening_lab.script.map(s => {
                    const lineEn = s.en || s.line || '';
                    const lineKn = s.kn || '';
                    return lineKn ? `${s.speaker || ''}: ${lineEn} (${lineKn})` : `${s.speaker || ''}: ${lineEn}`;
                }).join('\n')
                : (content.listening_lab?.script || json.listening?.transcription || prev.transcription)
        }));

        const formatAsArrayContent = (val) => {
            if (!val) return '[]';
            if (Array.isArray(val)) return JSON.stringify(val, null, 2);
            return JSON.stringify([val], null, 2);
        };

        // 2. Study Logic / Explanation (Magic Shift)
        if (content.logic_explanation) {
            const studyLogic = [{
                explanation: content.logic_explanation.content || '',
                english_logic: content.logic_explanation.title || '',
                kannadaStructure: (content.logic_explanation.examples || []).find(e => e.type?.includes('Kannada'))?.structure || [],
                englishStructure: (content.logic_explanation.examples || []).find(e => e.type?.includes('English'))?.structure || []
            }];
            setStudyContentRaw(JSON.stringify(studyLogic, null, 2));
        } else if (content.explanation) {
            const studyLogic = [{
                explanation: content.explanation.kannada || '',
                english_logic: content.explanation.english_logic || '',
                kannadaStructure: [],
                englishStructure: []
            }];
            setStudyContentRaw(JSON.stringify(studyLogic, null, 2));
        } else if (json.logicContent) {
            setStudyContentRaw(formatAsArrayContent(json.logicContent));
        }

        // 3. Sentence Evolution
        if (content.sentence_evolution) {
            const evolutionData = content.sentence_evolution.levels || content.sentence_evolution;
            if (Array.isArray(evolutionData)) {
                const evolution = evolutionData.map(step => ({
                    level: step.label || step.stage || step.level || 'Basic',
                    explanation: step.explanation || step.desc || '',
                    english: step.english || '',
                    kannada: step.kannada || ''
                }));
                setEvolutionContentRaw(JSON.stringify(evolution, null, 2));
            }
        } else if (json.evolutionContent) {
            setEvolutionContentRaw(formatAsArrayContent(json.evolutionContent));
        }

        // 4. Reading Lab
        if (content.reading_lab) {
            const readingData = [{
                text: content.reading_lab.text || '',
                pronunciation: content.reading_lab.phonetic_anchoring_kannada || content.reading_lab.phonetic_kannada || '',
                translation: ''
            }];
            setReadingContentRaw(JSON.stringify(readingData, null, 2));
        } else if (json.readingContent) {
            setReadingContentRaw(formatAsArrayContent(json.readingContent));
        }

        // 5. Vocabulary / Retention
        const retention = content.retention_block_m_srs || content.retention_block;
        if (retention?.gold_list) {
            const bridge = retention.mnemonic_bridge;
            const vocabData = retention.gold_list.map((item, idx) => ({
                word: item.word,
                translation: item.meaning || item.kn || item.kannada || '',
                pronunciation: item.pronunciation || '',
                mnemonic: (idx === 0 && bridge) ? `${bridge.word || bridge.concept || ''}: ${bridge.trick || bridge.logic || ''}` : '',
                category: 'The Gold List'
            }));
            setVocabularyContentRaw(JSON.stringify(vocabData, null, 2));
        } else if (json.vocabularyContent) {
            setVocabularyContentRaw(formatAsArrayContent(json.vocabularyContent));
        }

        // 6. Milestone Test Questions
        const rawQuestions = json.section_2_milestone_test || json.milestoneTest || content.milestone_test || content.milestoneTest || [];
        if (rawQuestions.length > 0) {
            const normalizedQuestions = rawQuestions.map(q => {
                let type = q.type || 'MCQ';
                if (type === 'Rearrange') type = 'Text';
                if (type === 'Multiple Choice') type = 'MCQ';
                if (type === 'Fill in the blank') type = 'Text';
                if (type === 'Matching') type = 'Text'; // Matching is complex, falling back to text
                if (type === 'Translation') type = 'Text';

                // Synthesize text if missing (common in Matching questions)
                let text = q.question || q.prompt || q.text || '';
                if (!text && q.pairs && Array.isArray(q.pairs)) {
                    text = `Match the following: ${q.pairs.map(p => p.english).join(', ')}`;
                } else if (!text) {
                    text = 'Please complete this activity.';
                }

                // Synthesize correct_answer if missing (common in Matching questions)
                let answer = q.correct_answer || q.answer || q.answer_placeholder || '';
                if (!answer && q.pairs && Array.isArray(q.pairs)) {
                    answer = q.pairs.map(p => `${p.english}-${p.kannada}`).join(', ');
                }

                // Normalization: If it's MCQ and "answer" is just a letter (e.g. "B"), 
                // resolve it to the full option text (e.g. "B) I grow ragi.")
                if (type === 'MCQ' && answer.length === 1 && Array.isArray(q.options)) {
                    const letterMatch = q.options.find(opt => 
                        opt.trim().startsWith(`${answer})`) || 
                        opt.trim().startsWith(`${answer}.`) || 
                        opt.trim().startsWith(`${answer} `)
                    );
                    if (letterMatch) answer = letterMatch;
                }

                return {
                    text: text,
                    correct_answer: answer || '',
                    type: type,
                    points: q.points || 10,
                    options: q.options || [],
                    explanation: q.explanation || q.hint || ''
                };
            });
            setQuestions(normalizedQuestions);
        }

        setMessage('Data pre-filled successfully. Please review each tab.');
        setGeneratedContentPreview(JSON.stringify(json, null, 2));
    };

    const handleJsonUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "application/json" && !file.name.endsWith('.json')) {
            alert("Please upload a valid JSON file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                prefillFormFromJSON(json);
            } catch (err) {
                console.error("JSON Parse Error:", err);
                alert("Failed to parse JSON file. Please ensure it's a valid JSON structure.");
            }
        };
        reader.readAsText(file);
        // Reset input value to allow uploading the same file again
        e.target.value = '';
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt) {
            alert("Please enter a topic or prompt for AI generation.");
            return;
        }
        setGenerating(true);
        try {
            const res = await aiApi.generateLessonContent({ prompt: aiPrompt, engine: aiEngine });
            const generatedJson = res.data.content;
            prefillFormFromJSON(generatedJson);
            setMessage('Content generated and pre-filled. Please review each tab.');
        } catch (err) {
            console.error(err);
            alert("Failed to generate content: " + (err.response?.data?.message || err.message));
        } finally {
            setGenerating(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setCurrentTab(id)}
            style={{
                padding: '1rem 2rem',
                border: 'none',
                background: currentTab === id ? 'var(--primary-light)' : 'transparent',
                color: currentTab === id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: currentTab === id ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.2s ease'
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="max-w-6xl mx-auto p-6" style={{ paddingBottom: '5rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ margin: 0 }}>
                    {lesson ? 'ಪಾಠ ನಿರ್ವಹಣೆ (Manage Lesson)' : 'ಹೊಸ ಪಾಠ ಸೇರಿಸಿ (Add New Lesson)'}
                </h2>
            </header>

            <div className="glass-card" style={{ padding: 0, marginBottom: '2rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', overflowX: 'auto' }}>
                    <TabButton id="ai-gen" label="1. AI Auto-Gen" icon={Wand2} />
                    <TabButton id="details" label="2. Details" icon={Plus} />
                    <TabButton id="study" label="3. Study" icon={HelpCircle} />
                    <TabButton id="reading" label="4. Reading" icon={HelpCircle} />
                    <TabButton id="vocabulary" label="5. Vocabulary" icon={HelpCircle} />
                    <TabButton id="media" label="6. Multimedia" icon={Upload} />
                    <TabButton id="questions" label="7. Questions" icon={HelpCircle} />
                </div>

                <div style={{ padding: '2.5rem' }}>
                    {currentTab === 'details' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Lesson Title</label>
                                <input
                                    className="glass-card"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                    type="text"
                                    placeholder="e.g. Introduction to Greetings"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Learning Level</label>
                                    <select
                                        className="glass-card"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    >
                                        <option value="Basic">Basic</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                        <option value="Expert">Expert</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Display Order (Within Module)</label>
                                    <input
                                        type="number"
                                        className="glass-card"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                        value={formData.displayOrder}
                                        onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Module Title (Optional)</label>
                                    <input
                                        className="glass-card"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                        type="text"
                                        placeholder="Leave empty for 'General'"
                                        value={formData.moduleTitle}
                                        onChange={(e) => setFormData({ ...formData, moduleTitle: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Unit / Module Number</label>
                                    <input
                                        type="number"
                                        className="glass-card"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                        value={formData.unitNumber}
                                        onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="isExam" 
                                        checked={formData.isExam} 
                                        onChange={(e) => setFormData({...formData, isExam: e.target.checked})}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <label htmlFor="isExam" style={{ fontWeight: 600, cursor: 'pointer' }}>Mark as Module Exam</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="isFinal" 
                                        checked={formData.isFinal} 
                                        onChange={(e) => setFormData({...formData, isFinal: e.target.checked})}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <label htmlFor="isFinal" style={{ fontWeight: 600, cursor: 'pointer' }}>Is Final Graduation Exam?</label>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                                <textarea
                                    className="glass-card"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', height: '120px' }}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setCurrentTab('ai-gen')} style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    ← Back to AI Auto-Gen
                                </button>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('study')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Study Logic →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'study' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Wand2 size={24} color="var(--primary)" /> ✨ Study Logic & Evolution
                            </h3>

                            <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Lesson Logic Breakdown (Magic Shift)</label>
                                <textarea
                                    className="glass-card"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', minHeight: '150px', color: 'var(--text-main)' }}
                                    placeholder='Define the grammar rules and sentence structures here as JSON or text...'
                                    value={studyContentRaw}
                                    onChange={(e) => setStudyContentRaw(e.target.value)}
                                />
                            </div>

                            <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Sentence Evolution Steps</label>
                                <textarea
                                    className="glass-card"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', minHeight: '150px', color: 'var(--text-main)' }}
                                    placeholder='Step-by-step sentence growth...'
                                    value={evolutionContentRaw}
                                    onChange={(e) => setEvolutionContentRaw(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setCurrentTab('details')} style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    ← Back to Details
                                </button>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('reading')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Reading Lab →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'reading' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Wand2 size={24} color="var(--primary)" /> 📖 Reading Lab Content
                            </h3>
                            <textarea
                                className="glass-card"
                                style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', minHeight: '300px', color: 'var(--text-main)' }}
                                value={readingContentRaw}
                                onChange={(e) => setReadingContentRaw(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setCurrentTab('study')} style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    ← Back to Study
                                </button>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('vocabulary')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Vocabulary →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'vocabulary' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Wand2 size={24} color="var(--primary)" /> 🔤 Vocabulary & Mnemonics
                            </h3>
                            <textarea
                                className="glass-card"
                                style={{ width: '100%', padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', minHeight: '300px', color: 'var(--text-main)' }}
                                value={vocabularyContentRaw}
                                onChange={(e) => setVocabularyContentRaw(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setCurrentTab('reading')} style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    ← Back to Reading
                                </button>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('media')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Multimedia →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'ai-gen' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                                    <Wand2 size={20} /> Generate Universal Study Area Content
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Topic or Prompt</label>
                                        <textarea
                                            className="glass-card"
                                            style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', height: '100px' }}
                                            placeholder="e.g. A lesson about Simple Present Tense for daily routines. Include vocabulary about morning activities."
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>LLM Engine</label>
                                            <select
                                                className="glass-card"
                                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                                value={aiEngine}
                                                onChange={(e) => setAiEngine(e.target.value)}
                                            >
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Balanced)</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {!generating && (
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleAIGenerate}
                                                style={{
                                                    flex: 1,
                                                    padding: '1rem',
                                                    marginTop: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.75rem',
                                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                                                }}
                                            >
                                                <Wand2 size={20} />
                                                Generate with AI
                                            </button>

                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    id="json-upload"
                                                    style={{ display: 'none' }}
                                                    onChange={handleJsonUpload}
                                                />
                                                <label
                                                    htmlFor="json-upload"
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        padding: '1rem',
                                                        marginTop: '0.5rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.75rem',
                                                        background: 'var(--bg-card)',
                                                        border: '1px solid var(--primary)',
                                                        color: 'var(--primary)',
                                                        cursor: 'pointer',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <Upload size={20} />
                                                    Upload JSON to Prefill
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {generating && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            style={{
                                                marginTop: '2rem',
                                                textAlign: 'center',
                                                padding: '2.5rem',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                borderRadius: '1.5rem',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '1rem'
                                            }}
                                        >
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    rotate: [0, 10, -10, 0],
                                                    filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"]
                                                }}
                                                transition={{ repeat: Infinity, duration: 3 }}
                                                style={{ color: '#8b5cf6', marginBottom: '1rem' }}
                                            >
                                                <Sparkles size={64} />
                                            </motion.div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                                <Loader2 className="animate-spin" size={24} color="#8b5cf6" />
                                                <h4 style={{ margin: 0, color: '#8b5cf6' }}>Simplish AI is crafting your lesson...</h4>
                                            </div>
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Generating bilingual logic, reading labs, and assessments.</p>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {generatedContentPreview && (
                                <div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Generated Content Schema Preview</h4>
                                    <textarea
                                        readOnly
                                        className="glass-card"
                                        style={{ width: '100%', padding: '1rem', background: '#1e1e1e', color: '#d4d4d4', border: '1px solid var(--border)', height: '300px', fontFamily: 'monospace', fontSize: '13px' }}
                                        value={generatedContentPreview}
                                    />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*This JSON data will power the @Universal Study Area tabs natively.*</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('details')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Details →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'media' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)' }}>
                                    <Upload size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>PDF Content</h4>
                                    <input type="file" accept=".pdf" onChange={(e) => setFiles({ ...files, pdf: e.target.files[0] })} style={{ width: '100%', fontSize: '0.8rem' }} />
                                    {lesson?.pdf_url && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '1rem' }}>✓ Existing PDF Saved</p>}
                                </div>
                                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)' }}>
                                    <Upload size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Audio Track</h4>
                                    <input type="file" accept="audio/*" onChange={(e) => setFiles({ ...files, audio: e.target.files[0] })} style={{ width: '100%', fontSize: '0.8rem' }} />
                                    {lesson?.audio_url && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '1rem' }}>✓ Existing Audio Saved</p>}
                                </div>
                                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)' }}>
                                    <Upload size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Video File</h4>
                                    <input type="file" accept="video/*" onChange={(e) => setFiles({ ...files, video: e.target.files[0] })} style={{ width: '100%', fontSize: '0.8rem' }} />
                                    {lesson?.video_url && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '1rem' }}>✓ Existing Video Saved</p>}
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Multimedia Transcription</label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Text placed here will appear as a synced transcription if an audio track is provided, or act as general reading material. This gets auto-filled if the AI generates a listening section.</p>
                                <textarea
                                    className="glass-card"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', height: '150px', color: 'var(--text-main)' }}
                                    placeholder="Enter audio transcription here..."
                                    value={formData.transcription}
                                    onChange={(e) => setFormData({ ...formData, transcription: e.target.value })}
                                />
                            </div>

                            {(files.audio || lesson?.audio_url) && (
                                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <img src="/images/microphone.png" alt="mic" style={{ width: '60px' }} />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600 }}>Audio Section Active</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>A motivation poster and microphone GIF will be shown to the student.</p>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                                <button className="btn" onClick={() => setCurrentTab('vocabulary')} style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                    ← Back to Vocabulary
                                </button>
                                <button className="btn btn-primary" onClick={() => setCurrentTab('questions')} style={{ padding: '0.8rem 3rem' }}>
                                    Next Section: Questions →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentTab === 'questions' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                            <div className="glass-card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0 }}>Add Question</h3>
                                    <div>
                                        <input type="file" accept=".csv" id="csv-upload" style={{ display: 'none' }} onChange={handleCsvUpload} />
                                        <label htmlFor="csv-upload" className="btn" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Upload size={16} /> Bulk Upload CSV
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Question Text</label>
                                        <input
                                            className="glass-card" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                            value={newQuestion.text}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Type</label>
                                            <select
                                                className="glass-card" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                                value={newQuestion.type}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                            >
                                                <option value="Text">Text</option>
                                                <option value="MCQ">MCQ</option>
                                                <option value="Voice">Voice</option>
                                                <option value="Image">Image</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Points</label>
                                            <input
                                                type="number"
                                                className="glass-card" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                                value={newQuestion.points}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    {newQuestion.type === 'MCQ' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Options (comma-separated)</label>
                                            <input
                                                className="glass-card" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                                value={newQuestion.options}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                                                placeholder="Choice A, Choice B, Choice C"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Correct Answer</label>
                                        <input
                                            className="glass-card" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)' }}
                                            value={newQuestion.correct_answer}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                                        />
                                    </div>
                                    <button className="btn btn-primary" onClick={handleAddQuestion} style={{ padding: '0.75rem' }}>
                                        {editingQuestionIdx !== null ? 'Update Question' : '+ Add to List'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="glass-card" style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Questions List ({questions.length})</h4>
                                    {questions.map((q, idx) => (
                                        <div key={idx} style={{ padding: '1rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>{q.type}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <Edit size={14} style={{ cursor: 'pointer' }} onClick={() => handleEditQuestion(idx)} />
                                                    <Trash2 size={14} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleDeleteQuestion(idx)} />
                                                </div>
                                            </div>
                                            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>{q.text}</p>
                                        </div>
                                    ))}
                                    {questions.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No questions added.</p>}
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSubmit()}
                                    disabled={status === 'loading'}
                                    style={{ padding: '1rem', width: '100%', background: 'var(--primary)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
                                >
                                    {status === 'loading' ? <Loader2 className="animate-spin" size={24} /> : 'Finalize & Save Lesson'}
                                </button>
                                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>All changes will be updated and you'll be returned to Library.</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {status === 'success' && <div style={{ color: '#4ade80', textAlign: 'center' }}>✓ {message}</div>}
            {status === 'error' && <div style={{ color: '#f87171', textAlign: 'center' }}>⚠ {message}</div>}
        </div>
    );
};

export default LessonCreate;
