# Brew & Co. | Xeno AI-Native Mini CRM

An AI-native Marketing CRM and campaign delivery simulator built for **Brew & Co.** (a coffee chain vertical). Slice shoppers into marketing audiences using AI segmentation, draft copy personalized with name tags via an AI writer, and observe live status updates (queued, sent, delivered, read, clicked, or failed) in real time.

## 🏗️ System Architecture

The project consists of three services:

1. **Frontend App (React + Vite 8 + Tailwind CSS v4 + Recharts)**
   - A single-page application built on a premium dark coffee theme with glassmorphic components.
   - Leverages Recharts for interactive delivery funnel charts and customer channel distribution.
   - Real-time polling to capture channel callback events.

2. **CRM Service (Flask + SQLAlchemy + SQLite)**
   - Manages customers, orders, segments, and campaigns.
   - Directs queries through SQLite using custom relational rule filtering.
   - Receives delivery webhook callbacks from the Channel Service at `/api/receipts`.
   - Interfaces with Claude API (via `anthropic` client) with mock fallbacks for all AI endpoints.

3. **Channel Service (Flask)**
   - A stubbed microservice that simulates external delivery networks (WhatsApp, SMS, Email, RCS).
   - Simulates async delivery lifecycle delays and probabilities in background threads.
   - Delivers status callback updates back to the CRM using exponential backoff retry policies.

---

## ⚡ Setup & Launch Instructions

To launch the stack locally, run each service in a separate terminal:

### 1. CRM Service (Backend)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*Runs on `http://localhost:5000`.*

### 2. Channel Service
```bash
cd channel-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*Runs on `http://localhost:5001`.*

### 3. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5173`.*

---

## 🤖 AI Co-Pilot Capabilities (Claude integration)

1. **Segment Suggestion**: Converts natural language prompts (e.g. *"Show VIPs in Mumbai who visited within the last 30 days"*) into executable SQL rule filters.
2. **Message Copywriter**: Generates personalized promotional templates matching the channel length and tone guidelines (WhatsApp, SMS, Email, RCS).
3. **Analytics Insights**: Runs post-mortem diagnostics on campaign stats to suggest optimizations (e.g., channel recommendations or bounce analysis).
