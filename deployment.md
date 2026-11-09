# Deployment & Running Guide: FleetTroops POD System

This document provides step-by-step instructions to run the application locally, execute the automated test suite, inspect the environment variables, and review demo credentials for all roles.

---

## 1. How to Run Locally (Step-by-Step)

### Prerequisites
* **Python 3.12+**
* **Node.js 18+**
* **uv** (recommended fast Python package manager)

---

### Step A: Start the Backend API & Database

Open Terminal 1:
```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create the virtual environment and install dependencies
uv venv
uv pip install -r requirements.txt greenlet

# 3. Initialize and seed realistic Company A test fleet data
uv run python -m app.core.seed

# 4. Start the backend ASGI server
uv run python -m uvicorn app.main:app --reload --port 8000
```

* Backend API Root: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`

---

### Step B: Start the Frontend Application

Open Terminal 2:
```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

* Frontend UI: `http://localhost:5173`

---

### Step C: Run the Automated Test Suite

Open Terminal 3:
```powershell
cd backend
uv run python -m pytest -v
```

Executes 8 automated unit and integration tests covering:
* Deterministic AI extraction & prompt heuristics
* 2-retake circuit breaker enforcement (stops infinite retakes at factory gates)
* Role-based access control (RBAC 403 Forbidden verification)
* DPDP Act 2023 phone & name privacy masking
* Tally Prime accounting XML export structure

---

## 2. Environment Variables Inventory

*(Names and descriptions only; no secret values are disclosed in accordance with assessment rules).*

| Variable Name | Purpose / Description |
| :--- | :--- |
| `PROJECT_NAME` | Name of the logistics application |
| `SECRET_KEY` | Cryptographic secret key used to sign JWT authentication tokens |
| `ALGORITHM` | Algorithm used for JWT token encoding and verification (e.g. HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token session validity duration in minutes |
| `DATABASE_URL` | Asynchronous SQLite connection string |
| `GEMINI_API_KEY` | Google Gemini Vision API key for document extraction (optional) |
| `USE_MOCK_AI` | Boolean flag: Set to `True` to enable the 100% offline deterministic rule engine fallback; set to `False` to route through live Gemini Vision AI |
| `UPLOAD_DIR` | Local directory path where uploaded POD photos are stored |

---

## 3. Demo Login Details for the Reviewer

The application includes an **Evaluator Quick-Switcher Bar** on the top of every screen to let reviewers test each role with a single click, alongside standard demo login credentials:

| Role | User Name | Assigned Fleet Context & Access |
| :--- | :--- | :--- |
| **Driver (Own Fleet)** | Ramesh Jadhav | Truck `MH20 EL 4521`, Nagpur cement route. Access to one-touch camera capture, Marathi/Hindi audio prompts, and offline sync. |
| **Hired Driver (SMS Link)** | External Driver Flow | Truck `MH17 BY 3092`, Indore route. Accessible via top-right *"Demo Hired Driver SMS Link"* without login. |
| **Billing Executive** | Priya Sharma | HQ Billing Desk. Access to Exception Review Queue, quantity overrides, and Tally Prime XML export. |
| **Operations Head** | Anand Deshmukh | Executive Fleet Dashboard. Working capital unlocked tracker (₹3.24 Cr), branch turnaround days, Kasara Ghat aging alerts. |
| **Consignor Client** | Company B Audit Desk | Consignor Portal. Read-only audit access to stamped delivery proofs with DPDP 2023 masked consignee contacts. |
