# SIMPLISH LMS: COMPREHENSIVE TESTING QUESTIONNAIRE

This document serves as a structured UAT (User Acceptance Testing) guide for the Simplish LMS platform. It is divided into **Administrator** and **End-User** modules.

---

## 🛠️ MODULE 1: ADMINISTRATOR (Staff & Management)

### 1.1 Authentication & Security
- [ ] **Admin Login**: Can the administrator log in with valid credentials? (Role: `admin` or `super_admin`)
- [ ] **Role Authorization**: Are non-admin users restricted from accessing the `/admin` route?
- [ ] **Session Security**: Does the dashboard correctly invalidate the token upon clicking 'Logout'?

### 1.2 Dashboard & Metrics
- [ ] **KPI Accuracy**: Do the 'Total Users', 'Active Memberships', and 'Course Completions' match the database records?
- [ ] **Growth Trends**: Are the Month-over-Month (MoM) growth calculations displaying correctly for each lesson category?
- [ ] **Visual Integrity**: Are all charts and metric cards rendering without horizontal scroll issues on laptop screens?

### 1.3 Content Management (CMS)
- [ ] **Lesson Creation**: Can a new lesson be created with PDF, Audio, and Video files attached?
- [ ] **Media Playback**: After upload, do the video and audio players in the 'Study Area' work correctly for that lesson?
- [ ] **Milestone Synchronization**: When editing a lesson's JSON content, are the changes reflected immediately in the student's 'Test' tab?
- [ ] **Deletion Safety**: Does deleting a lesson also properly remove its associated progress records (or handle them gracefully)?

### 1.4 User & Role Management
- [ ] **Promotion/Demotion**: Can a Super Admin successfully change a user's role from `User` to `Admin`?
- [ ] **Account Suspension**: Does changing a user's status to `Inactive` prevent them from logging in?
- [ ] **Data Audit**: Can the admin view a specific user's learning history and billing records accurately?

### 1.5 Billing & System Logs
- [ ] **Transaction History**: Can the admin view all all-time transactions in the billing dashboard?
- [ ] **System Health**: Are the backend logs readable via the 'System Logs' tab for debugging server-side issues?

---

## 🎓 MODULE 2: END-USER (Student Learning Experience)

### 2.1 Onboarding & Placement
- [ ] **Registration**: Can a new user register and receive an immediate 'Success' confirmation?
- [ ] **Placement Test**: Does the placement test logic correctly assign the user to a level (Basic, Intermediate, Advanced) based on their score?
- [ ] **Initial Access**: Are 'Basic' lessons unlocked by default for new registrants?

### 2.2 The Learning Interface
- [ ] **Sequential Navigation**: Is the 'Next Lesson' button locked until the current milestone test is passed?
- [ ] **Mixed Media**: Can the user switch between Video, Audio, and PDF views without losing their place?
- [ ] **Responsive Design**: Is the sidebar navigation functional on mobile/tablet resolutions?

### 2.3 Interactive Assessments
- [ ] **MCQ Integration**: Do multiple-choice questions provide immediate 'Correct/Incorrect' feedback?
- [ ] **Match the Following**: Does the interactive matching grid (English -> Kannada) link pairs correctly?
- [ ] **Voice/Image Upload**: If prompted, can the user upload/record media for assessment?
- [ ] **Score Calculation**: Does scoring 70%+ correctly trigger the "Mastery" achievement and unlock the next lesson?

### 2.4 Wallet & Financials (Premium Access)
- [ ] **Balance Visibility**: Is the 'Current Balance' consistently displayed in the Navbar and Top-Up page?
- [ ] **Paywall Logic**: Are 'Intermediate' and 'Expert' lessons locked for users without a premium membership?
- [ ] **Top-Up Flow**: Can the user initiate a payment? (Verify if the amount is added to the balance upon successful confirmation).
- [ ] **Renewal**: Does 'Renew Access' correctly deduct funds from the wallet and extend the membership?

### 2.5 Profile & Progress
- [ ] **Profile Update**: Can the user change their full name or phone number in settings?
- [ ] **Persistence**: If the user logs out and back in, is their lesson progress (last tab visited, completion %) preserved?

---

## 📈 SCORING LEGEND
| Status | Description |
| :--- | :--- |
| **PASS** | Feature works exactly as expected. |
| **FAIL** | Feature is broken or produces incorrect output. |
| **P-PASS** | Partial Pass: Works but with UI glitches or minor latency. |
| **N/A** | Not applicable for this testing environment. |
