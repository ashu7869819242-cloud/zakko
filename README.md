# 🎓 SAITM Smart Canteen — AI Powered Ordering

A premium, high-performance web application designed for SAITM College Canteen. Featuring AI-driven ordering, secure digital wallets, real-time tracking, and a powerful admin ecosystem.

---

## 🚀 How to Run Manually

If you are having trouble running the project, follow these exact steps carefully.

### 1️⃣ Prerequisites
- **Node.js**: v18.0.0 or higher ([Download here](https://nodejs.org/))
- **Terminal**: Use PowerShell, CMD, or Bash.

### 2️⃣ Installation
Open your terminal and run:
```bash
# 1. Go into the project folder
cd college-canteen

# 2. Install all required packages
npm install
```

### 3️⃣ Setup Environment
The project **will not run** without your secret keys. 
1. Open the file named `.env.local` in the project root.
2. Ensure all keys (Firebase, Admin, Razorpay, AI Keys) are correctly filled.

### 4️⃣ Start the Engine
Run this command to start the server:
```bash
npm run dev
```
Once you see `✓ Ready`, open: 
- **User App**: [http://localhost:3000](http://localhost:3000)
- **Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🛠️ Common Issues & Fixes (Troubleshooting)

| Issue | Solution |
| :--- | :--- |
| **Port 3000 already in use** | Run `npx kill-port 3000` or restart your computer. |
| **Missing `.env` error** | Make sure `.env.local` exists and contains all required keys. |
| **Firebase "Invalid Key"** | Check your Firebase Project settings and update the keys in `.env.local`. |
| **White Screen / No Text** | Ensure you are using Tailwind v4 compatible styles (we have already fixed this in the core). |
| **Modules not found** | Run `npm install` again to ensure all dependencies are properly downloaded. |

---

## 💎 Key Features

### 👤 Student App
- **AI Campus Bot**: Order food by chatting. Powered by Gemini, Groq, and Cohere.
- **Digital Wallet**: Instant P2P transfers and Razorpay-powered top-ups.
- **Live Tracking**: Real-time status updates from "Pending" to "Ready".

### 👑 Admin Dashboard
- **Analytics**: Live revenue charts and sales insights.
- **Menu Control**: Instant availability toggles and stock management.
- **Canteen Status**: One-click global Open/Close switch.

---

## 🎛️ Default Admin Access
> [!IMPORTANT]
> Use these credentials for the `/admin` portal:
> - **Username**: `admin`
> - **Password**: `canteen@admin2024`

---

Developed with ❤️ for SAITM Smart Canteen 📦✨

