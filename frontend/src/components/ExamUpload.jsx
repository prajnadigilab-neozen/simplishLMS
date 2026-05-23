import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { lessonApi } from '../utils/api';
import { useToast } from './Toast';

const ExamUpload = ({ onBack }) => {
    const [jsonInput, setJsonInput] = useState('');
    const [level, setLevel] = useState('Basic');
    const [displayOrder, setDisplayOrder] = useState(100); // Standardize exams at the end of modules
    const [status, setStatus] = useState('idle');
    const showToast = useToast();

    const handleUpload = async () => {
        if (!jsonInput.trim()) {
            showToast('ದಯವಿಟ್ಟು JSON ಡೇಟಾವನ್ನು ಸೇರಿಸಿ (Please paste JSON data first).', 'error');
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonInput);
        } catch (e) {
            showToast('ಅಮಾನ್ಯ JSON ಫಾರ್ಮ್ಯಾಟ್ (Invalid JSON format). Please check for syntax errors.', 'error');
            return;
        }

        // Validate basic structure
        if ((!parsedData.module_header && !parsedData.test_header) || !parsedData.test_metadata || !parsedData.test_content) {
            showToast('JSON required fields missing: module_header (or test_header), test_metadata, test_content.', 'error');
            return;
        }

        setStatus('loading');
        try {
            const isFinalExam = level === 'Final' || parsedData.isFinal === true;
            // Transform to lesson format
            const contentPayload = {
                ...parsedData,
                isExam: true, // CRITICAL FLAG
                isFinal: isFinalExam
            };

            const data = new FormData();
            data.append('title', parsedData.module_header || parsedData.test_header);
            data.append('level', level === 'Final' ? 'Expert' : level);
            data.append('description', level === 'Final' ? 'SIMPLISH Ultimate Graduation Exam (Level 1 to 4)' : `Graduation Test: ${parsedData.test_metadata?.test_id || 'Exam'}`);
            
            const resolvedDisplayOrder = level === 'Final' ? 1 : displayOrder;
            data.append('display_order', resolvedDisplayOrder);
            data.append('displayOrder', resolvedDisplayOrder);
            data.append('content', JSON.stringify(contentPayload));

            await lessonApi.upload(data);
            showToast('ಪರೀಕ್ಷೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಅಪ್ಲೋಡ್ ಮಾಡಲಾಗಿದೆ! (Exam uploaded successfully!)', 'success');
            setJsonInput('');
            setStatus('success');
            setTimeout(() => onBack(), 2000); // Auto navigate back
        } catch (error) {
            console.error(error);
            showToast('Upload failed: ' + (error.response?.data?.message || error.message), 'error');
            setStatus('idle');
        }
    };

    return (
        <div className="admin-container">
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    className="btn"
                    onClick={onBack}
                    style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
                <div>
                    <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🎓 Add Module Exam
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Paste the Graduation Test JSON structure below.</p>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>ಮಾಡ್ಯೂಲ್ ಹಂತ (Module Level):</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                        >
                            <option value="Basic">Basic (ಬುನಾದಿ)</option>
                            <option value="Intermediate">Intermediate (ಮಧ್ಯಮ)</option>
                            <option value="Advanced">Advanced (ಮುಂದುವರಿದ)</option>
                            <option value="Expert">Expert (ಪರಿಣತ)</option>
                            <option value="Final">🏆 Final Graduation Exam (ಅಂತಿಮ ಪದವಿ ಪರೀಕ್ಷೆ)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>ಕ್ರಮ ಸಂಖ್ಯೆ (Display Order):</label>
                        <input
                            type="number"
                            value={level === 'Final' ? 1 : displayOrder}
                            disabled={level === 'Final'}
                            onChange={(e) => setDisplayOrder(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: level === 'Final' ? 'rgba(255,255,255,0.05)' : 'var(--bg-dark)', color: level === 'Final' ? 'var(--text-muted)' : 'var(--text-main)', border: '1px solid var(--border)', cursor: level === 'Final' ? 'not-allowed' : 'text' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {level === 'Final' 
                                ? 'Final Graduation Exam has a fixed display order of 1 (placed separately outside modules).'
                                : 'Exams usually have high numbers (e.g., 100) to appear last in the module.'}
                        </span>
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label>Exam JSON Data:</label>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Paste the generated Exam JSON here..."
                        style={{
                            width: '100%',
                            minHeight: '400px',
                            fontFamily: 'monospace',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            background: 'var(--bg-dark)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={status === 'loading'}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem' }}
                    >
                        {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                        {status === 'loading' ? 'Uploading...' : 'Upload Exam'}
                    </button>
                </div>

                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ mt: '1rem', p: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', marginTop: '1rem' }}
                    >
                        <CheckCircle2 size={18} />
                        Exam uploaded successfully. Redirecting...
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ExamUpload;
