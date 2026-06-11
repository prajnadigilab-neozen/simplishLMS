# Hostinger Deployment Guide for SimplishLMS
This guide provides step-by-step instructions for deploying both the **React/Vite Frontend** and **Node.js Express Backend** of **SimplishLMS** simultaneously on the subdomain **`lms.simplish.in`** using Hostinger.

---

## 🏗️ 1. Architecture Overview (Same-Origin Deployment)
To simplify routing, avoid CORS issues, and minimize hosting costs, SimplishLMS is designed to run as a **unified same-origin application** in production. 

```
┌─────────────────────────────────────────────────────────────────┐
│                       Hostinger Server                          │
│                                                                 │
│   lms.simplish.in ──────►  Express Backend (server.js)          │
│                                 │                               │
│                                 ├──► /api/v1/*   (API Routes)   │
│                                 │                               │
│                                 └──► /*          (React SPA)    │
│                                       (Serves frontend/dist/*)  │
└─────────────────────────────────────────────────────────────────┘
```

When `NODE_ENV=production` is set, the Express backend automatically serves the React static build from the `frontend/dist` directory:
- API requests (like `/api/v1/auth/login`) are processed by backend controllers.
- Uploaded media requests (like `/uploads/audio.mp3`) are served from the backend's storage directory.
- All other requests are routed to the React router SPA (`frontend/dist/index.html`).

---

## 🌐 2. Step-by-Step Subdomain & SSL Setup
First, we must prepare the subdomain `lms.simplish.in` in your Hostinger account.

1. Log into your **Hostinger hPanel**.
2. Navigate to **Websites** ➔ **Manage** (for your main domain `simplish.in`).
3. In the left sidebar, search for **Subdomains**.
4. In the **Create a Subdomain** form:
   - Enter **`lms`** as the subdomain (resulting in `lms.simplish.in`).
   - Check the **Use custom folder for subdomain** option.
   - Set the folder name to **`public_html/lms`** (this ensures the subdomain files are isolated from the main site).
   - Click **Create**.
5. Go to **Security** ➔ **SSL** in hPanel, find `lms.simplish.in`, and ensure the **Let's Encrypt SSL certificate** is installed and active.

---

## 🛠️ 3. Configuring Node.js Web App in Hostinger hPanel
On Hostinger's Managed Business/Cloud Hosting, Node.js applications are configured via a dedicated dashboard.

1. In hPanel, search for **Node.js** or go to **Websites** ➔ **Node.js Dashboard**.
2. Click **Create Application** and fill out the details:
   - **Subdomain/Domain**: Select `lms.simplish.in`.
   - **Application Directory**: Set to `/public_html/lms` (or the folder you created in Step 2).
   - **Node.js Version**: Select **`Node 20`** (or newer).
   - **Application Startup File**: Set to **`app.js`** (we will create a root wrapper `app.js` file below to make Passenger routing 100% stable).
3. Under **Environment Variables**, add the required variables (do **not** upload a `.env` file for production; setting them in the panel is more secure):
   
   | Key | Example Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables static serving of Vite assets |
   | `PORT` | `5000` | Internally mapped port (Hostinger handles routing) |
   | `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase API URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Your Supabase service role API key |
   | `FRONTEND_URL` | `https://lms.simplish.in` | Subdomain URL (used for CORS/Auth redirects) |
   | `GEMINI_API_KEY` | `AIzaSy...` | Gemini AI API key |
   | `RAZORPAY_KEY_ID` | `rzp_live_...` or `rzp_test_...` | Razorpay API key |
   | `RAZORPAY_KEY_SECRET` | `your_razorpay_secret` | Razorpay API secret |
   | `RAZORPAY_WEBHOOK_SECRET` | `your_webhook_secret` | Razorpay webhook signature verification key |
   | `CDN_URL` | *(Optional)* | Optional CDN base path |
   | `SENTRY_DSN` | *(Optional)* | Optional Sentry tracking DSN |

4. Click **Save** to apply the configuration.

---

## ⚡ 4. Resolving the `-bash: npm: command not found` Error in SSH
Hostinger's jailed SSH environment does not expose Node/NPM globally by default. If you need to run tasks manually via SSH (such as installing packages or running a custom script), follow these commands to install **NVM (Node Version Manager)** in your user directory.

1. Connect to your Hostinger server via SSH:
   ```bash
   ssh -p 65002 u773383639@82.112.232.72
   ```
2. Download and run the NVM installer:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```
3. Load NVM into your current terminal session:
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
   ```
4. Install Node.js v20 (LTS):
   ```bash
   nvm install 20
   nvm use 20
   ```
5. Verify that `npm` and `node` now work correctly:
   ```bash
   node -v
   npm -v
   ```
   > [!TIP]
   > NVM automatically appends configuration lines to your `~/.bashrc` file. This means the next time you connect via SSH, `node` and `npm` will be active automatically.

---

## 📦 Option A: Manual Deployment (Build Locally, Upload via FTP)
If you prefer deploying manually without setting up GitHub pipelines:

### Step 1: Create a Root Entry File (`app.js`)
Hostinger's application manager uses **Phusion Passenger** to run Node.js apps. Passenger expects your startup file to be in the root folder. 
Create a file named `app.js` at the root of your project:
```javascript
// app.js (Root entry file for Hostinger Passenger)
require('./backend/server.js');
```

### Step 2: Build the React Frontend Locally
Building the frontend on your local machine is faster and prevents Hostinger server timeouts:
1. Open a terminal on your computer and navigate to the project's frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   This compiles your React application and outputs it to the `frontend/dist` directory.

### Step 3: Archive the Files
Create a `.zip` archive containing only the necessary production folders. **Do not include the local `node_modules` folders.**
Your ZIP archive should have this structure:
```text
simplish-deployment.zip
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── server.js
│   └── package.json
├── frontend/
│   └── dist/            <-- ONLY the dist directory is needed!
├── app.js               <-- Root wrapper created in Step 1
├── package.json         <-- Root package.json
└── package-lock.json    <-- Root package-lock.json
```

### Step 4: Upload and Extract
1. Open **File Manager** in Hostinger hPanel.
2. Navigate to `/public_html/lms/`.
3. Upload `simplish-deployment.zip` and **Extract** it directly into the directory.
4. Open your SSH terminal, navigate to `/public_html/lms/`, and run:
   ```bash
   npm install --production
   ```
   *(Note: This uses the root workspace settings to install the required backend modules).*
5. Go to the hPanel **Node.js Dashboard** and click **Start** (or **Restart**) to boot the server.

---

## 🤖 Option B: Automated Deployment (GitHub Actions CI/CD)
The recommended way to deploy both frontend and backend simultaneously is using **GitHub Actions**. This automatically builds the frontend, uploads the files, installs packages, and restarts the server with every git push to the `main` branch.

### Step 1: Create the Workflow File
Create a new file in your project at `.github/workflows/deploy.yml`:
```yaml
name: Build and Deploy SimplishLMS to Hostinger

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'

    # --- BUILD FRONTEND ---
    - name: Install Frontend Dependencies & Build
      run: |
        cd frontend
        npm install
        npm run build

    # --- PREPARE STAGING DIRECTORY ---
    # Creates a clean build folder for deployment (excluding dev/test files)
    - name: Prepare Staging Files
      run: |
        mkdir staging
        cp -r backend staging/backend
        mkdir -p staging/frontend
        cp -r frontend/dist staging/frontend/dist
        cp package.json staging/package.json
        cp package-lock.json staging/package-lock.json
        
        # Create the Root App Wrapper for Passenger
        echo "require('./backend/server.js');" > staging/app.js

    # --- UPLOAD FILES VIA SFTP ---
    - name: Deploy to Hostinger via SFTP
      uses: SamKirkland/FTP-Deploy-Action@v4.3.5
      with:
        server: ${{ secrets.HOSTINGER_SFTP_SERVER }}
        username: ${{ secrets.HOSTINGER_SFTP_USERNAME }}
        password: ${{ secrets.HOSTINGER_SFTP_PASSWORD }}
        port: 65002
        local-dir: ./staging/
        server-dir: /domains/simplish.in/public_html/lms/
        dangerous-clean-html: false # Keeps uploads/ folder safe on the server

    # --- RESTART NODE APPLICATION ---
    # Passenger monitors the tmp/restart.txt file and restarts the app when it is modified
    - name: Install Production Deps & Restart App
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.HOSTINGER_SFTP_SERVER }}
        username: ${{ secrets.HOSTINGER_SFTP_USERNAME }}
        password: ${{ secrets.HOSTINGER_SFTP_PASSWORD }}
        port: 65002
        script: |
          # Load NVM Node environment
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
          
          cd /domains/simplish.in/public_html/lms
          npm install --production
          
          # Force Hostinger Passenger to restart
          mkdir -p tmp
          touch tmp/restart.txt
```

### Step 2: Configure Your GitHub Secrets
Add your server's credentials securely in your GitHub repository's settings:
1. Go to your repository on GitHub.
2. Select **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Click **New repository secret** and add:
   - **`HOSTINGER_SFTP_SERVER`**: `82.112.232.72` (Your Hostinger Server IP)
   - **`HOSTINGER_SFTP_USERNAME`**: `u773383639` (Your SSH/SFTP Username)
   - **`HOSTINGER_SFTP_PASSWORD`**: *Your SSH Password*

Now, whenever you push changes to your `main` branch, GitHub Actions will compile your React app, deploy it along with the backend, and trigger an application restart!

---

## ✅ 5. Verification Checklist
Once deployed, perform the following verification:

1. **Test Frontend Loading**: Visit `https://lms.simplish.in`. Ensure the frontend loads correctly.
2. **Verify API Connection**: Try logging in or signing up. If login fails, check that your Environment Variables (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) are correctly set in the Node.js Dashboard.
3. **Verify SPA Routing**: Navigate to a subpage (e.g. `https://lms.simplish.in/lessons`) and refresh the page. If it returns a 404, check that `NODE_ENV` is set to `production` so that Express forwards wildcard routes to `index.html`.
4. **Inspect Logs**: If you see a **503 Service Unavailable** or **403 Forbidden**, check the logs on Hostinger in `/public_html/lms/backend/logs/` or inside the Node.js application management page.
