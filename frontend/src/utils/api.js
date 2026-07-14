import axios from 'axios';
import { safeGetItem, safeRemoveItem } from './storageUtils';

// Using relative paths — Vite proxy forwards /api → localhost:5000
// This works in dev (via proxy) and in production (same-origin deployment).
const API_BASE_URL = '/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Crucial for sending/receiving HTTP-Only cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically attach token from localStorage to every request
api.interceptors.request.use((config) => {
    const token = safeGetItem('simplish_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Automatically handle expired tokens (401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Check if we are already logging out to prevent loops
            if (safeGetItem('simplish_token')) {
                console.warn('Token expired or invalid. Logging out automatically.');
                safeRemoveItem('simplish_token');
                safeRemoveItem('simplish_user');
                window.location.href = '/'; // Force a full reload to reset React state
            }
        }
        return Promise.reject(error);
    }
);

export const lessonApi = {
    getAll: (params) => api.get('/lessons', { params }),
    getMyProgress: (params) => api.get('/lessons/my-progress', { params }),
    getOne: (id) => api.get(`/lessons/${id}`),
    upload: (formData) => api.post('/lessons/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, formData) => api.put(`/lessons/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (id) => api.delete(`/lessons/${id}`),
    updateProgress: (id, data) => api.post(`/lessons/${id}/progress`, data)
};

export const assessmentApi = {
    getByLesson: (lessonId) => api.get(`/assessments/lesson/${lessonId}`),
    upsertQuestions: (lessonId, questions) => api.post(`/assessments/lesson/${lessonId}/questions`, { questions }),
    submit: (formData) => api.post('/assessments/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    processMedia: (formData) => api.post('/assessments/process-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    submitFeedback: (examId, data) => api.post(`/exams/${examId}/feedback`, data),
    getAllFeedback: () => api.get('/exams/feedback')
};


export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    sendOtp: (data) => api.post('/auth/send-otp', data),
    verifyOtp: (data) => api.post('/auth/verify-otp', data),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: (token) => api.get('/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (formData, token) => api.put('/auth/profile', formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    }),
    getAllUsers: (params = {}) => api.get('/auth/users', { params }),
    updateRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }),
    updateStatus: (id, status) => api.put(`/auth/users/${id}/status`, { status }),
    deleteUser: (id) => api.delete(`/auth/users/${id}`),
    deleteMe: () => api.delete('/auth/me'),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    getSystemLogs: () => api.get('/auth/logs')
};

export const placementApi = {
    getQuestions: () => api.get('/placement/questions'),
    submit: (answers) => api.post('/placement/submit', { answers }),
    getLeaderboard: () => api.get('/placement/leaderboard'),
};

export const reportApi = {
    getSummary: () => api.get('/reports/summary'),
    getActivity: () => api.get('/reports/activity'),
    getDailyReport: (params = {}) => api.get('/reports/daily', { params }),
    getRefundReport: (params = {}) => api.get('/reports/refunds', { params }),
};



export const billingApi = {
    initiate: (data) => api.post('/billing/initiate', data),
    confirm: (data) => api.post('/billing/confirm', data),
    getHistory: () => api.get('/billing/history'),
    refund: (data) => api.post('/billing/refund', data),
};

export const settingsApi = {
    get: () => api.get('/settings'),
    update: (settings) => api.put('/settings', { settings }),
};

export const aiApi = {
    generateLessonContent: (data) => api.post('/ai/generate-lesson', data),
};

export const attributionApi = {
    logClick: (data) => api.post('/attribution/click-log', data),
    getLogs: () => api.get('/attribution/logs')
};

export default api;
