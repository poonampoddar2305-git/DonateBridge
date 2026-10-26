# DonateBridge — Complete System Context & Engineering Documentation

DonateBridge is a full-stack, AI-enhanced platform designed to facilitate transparent, accountable, and geographically-optimized donations between individual donors and vetted Non-Governmental Organizations (NGOs).

Built as a **B.Tech Final-Year Academic Project & Client MVP**, DonateBridge combines deterministic multi-factor matching, manual NGO document verification workflows, real-time WebSocket cargo tracking, and a local dual-retrieval RAG (Retrieval-Augmented Generation) AI assistant.

---

## 1. System Architecture & Tech Stack

```text
React 19 + Vite (Tailwind CSS, Lucide Icons, Leaflet Maps)
              ↓
Django 5.2 REST Framework + SimpleJWT Authentication
              ↓
PostgreSQL Server 17 Database + Django Channels (Daphne WebSockets)
              ↓
Ollama (llama3:latest) + Local Vector RAG (index.json)
```

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide React, Leaflet Maps.
- **Backend**: Django 5.2, Django REST Framework, SimpleJWT, Django Channels, Daphne.
- **AI / RAG**: Ollama local inference engine (`llama3:latest`), local vector similarity search (`media/vector_store/index.json`), term feature hashing embedder.

---

## 2. Completed Feature Inventory (Steps 1–7)

1. **NGO Registration & Document Verification (Step 1)**:
   - Full legal filing workflow (`govRegCert`, `pan80G`, `fcraCert`, `annualReport`).
   - Admin audit queue with decision states (`pending`, `approved`, `rejected`, `changes_requested`).
   - Admin feedback loop allowing NGOs to resubmit modified filings.
2. **Security Hardening & RBAC (Step 2)**:
   - SimpleJWT authentication with role enforcement (`donor`, `ngo`, `admin`).
   - Object-level ownership validation on donations, logistics jobs, and confidential document URLs.
3. **Real-Time WebSocket Chat & Notifications (Step 3)**:
   - Native browser WebSockets connecting to Django Channels (`ws://localhost:8000/ws/chat/{id}/`).
   - Automated notification triggers for NGO approvals, claims, cargo dispatch, and delivery.
4. **Ollama AI Intent Extraction (Step 4)**:
   - Natural language intent extraction mapping donor requests to structured categories and quantities.
   - Multi-item extraction and clarification prompts for ambiguous queries.
5. **Explainable AI Matching (Step 5)**:
   - Multi-factor deterministic Smart Matching algorithm (Category 30%, Distance 20%, Urgency 15%, Trust 10%, Quantity 15%, Freshness 10%).
   - Fact-grounded AI explanations derived strictly from verified backend match factors.
6. **RAG Knowledge Base & Live AI Data (Step 6)**:
   - Dual-path retrieval: Static documentation vector RAG + Live Django ORM queries.
   - Grounded source citations (`PROJECT_CONTEXT.md — NGO Profile & Registration`) and strict out-of-scope question rejection.
   - Ollama offline fallback ensuring system reliability.
7. **Final-Year Project Polish & Demo Readiness (Step 7)**:
   - 37/37 automated backend tests passing.
   - Automated database seeding (`python manage.py seed_db`) and knowledge ingestion (`python manage.py ingest_knowledge`).

---

## 3. Key Administrative & Test Credentials

- **Admin**: `admin` / `admin@donatebridge.org` / `admin123`
- **Donor**: `donortest` / `donor@test.com` / `password123`
- **NGO**: `hopefoundation` / `contact@hopefoundation.org` / `ngo12345`

---

## 4. Local Execution Commands

```bash
# Backend (server/)
python manage.py migrate
python manage.py seed_db
python manage.py ingest_knowledge
python manage.py runserver 0.0.0.0:8000

# Automated Tests (server/)
python manage.py test ai authentication ngo donation logistics chat notification moderation
python manage.py check
python manage.py makemigrations --check

# Frontend (client/)
npm install
npm run dev
npm run build
```

---

## 5. The 6-Step Milestone Logistics Tracking Workflow

DonateBridge features an end-to-end, physical cargo dispatch and delivery tracking workflow comprising exactly six sequential milestones:

1. **Step 1: Requested (Donation Logged)**
   - The donor posts an item donation listing with category, quantity, description, photos, and pickup coordinates.
   - The donation is logged in the system with initial status (`SUBMITTED` or `VERIFIED`), awaiting claim by a verified NGO or smart matching.

2. **Step 2: Approved (Match Confirmed)**
   - The donation is audited and paired with verified NGO requirements through the multi-factor Smart Matching algorithm.
   - Administrative integrity checks ensure item compliance, safety, and suitability.

3. **Step 3: Dispatched (Carrier Assigned)**
   - A verified NGO claims the donation. A logistics carrier/courier is assigned (`LogisticsJob`).
   - The platform creates a unique verification token and dispatches the courier to the donor's pickup address.
   - The donor receives an automated push notification and live toast alert confirming courier dispatch.

4. **Step 4: In Transit (Package Collected & Underway)**
   - The courier arrives at the donor's location, verifies the physical supplies against the listing, and collects the parcel.
   - The shipment enters the in-transit state moving toward the destination NGO hub facility.
   - Live Leaflet map markers update to reflect current midpoint GPS coordinates between donor and NGO.

5. **Step 5: Delivered (Arrived at NGO Facility)**
   - The courier arrives at the destination NGO facility address.
   - The package is presented to the NGO receiving personnel for inspection.
   - Shipment status transitions to Delivered.

6. **Step 6: Completed (Cryptographic QR Handover & Ledger Finalization)**
   - The courier and NGO representative complete the final handover through a secure QR code verification scan (`VerifyQRCodeView`).
   - A digital proof of delivery receipt is generated, timestamped, and permanently recorded on the transaction ledger.
   - The donation record moves to its final completed state (`DELIVERED`), updating platform impact analytics.

---

## 6. NGO Registration & Document Verification Workflow

To guarantee safety and prevent fraudulent charities from accessing donor supplies, DonateBridge enforces strict NGO verification:

1. **Registration Filing**:
   - The NGO representative creates an account and completes the legal registration wizard (`/ngo-register`).
   - Required information includes legal NGO name, registration/FCRA number, operational address, exact geographic coordinates, and mission focus areas.
2. **Statutory Paperwork Upload**:
   - NGOs must upload statutory paperwork: Government Registration Certificate (`govRegCert`), PAN Card / Tax Document (`panCard`), Trust/Society Deed, Office Address Proof, and FCRA/80G certificates.
3. **Administrator Audit Queue**:
   - Superusers and platform administrators review pending NGOs in the Admin Moderation Console (`/admin`).
   - Administrators inspect uploaded legal documents, verification letters, and NGO coordinates.
   - The administrator executes one of three audit actions:
     - **Approve**: NGO status is updated to `approved`. The NGO is published in the public directory, can broadcast active demands, claim donations, and initiate direct chats.
     - **Reject**: NGO status is updated to `rejected` with a mandatory rejection explanation.
     - **Request Changes**: NGO status is set to `changes_requested` with detailed feedback. The NGO can modify its profile, re-upload documents, and resubmit for review.

---

## 7. Donor Identity & Tax Verification (KYC Workflow)

DonateBridge protects the platform against fraudulent listings through donor identity verification:

1. **Identity Data Entry**:
   - During registration or from the Donor Profile, donors enter their 12-digit Aadhaar UID (`XXXX-XXXX-XXXX`) and 10-character alphanumeric PAN card number (e.g., `ABCDE1234F`).
   - Donors upload scanned copies or photos of their Aadhaar and PAN documents.
2. **Administrator Verification Review**:
   - Administrators review donor submissions in the dedicated Donor Verification tab of the Admin Console (`/admin`).
   - Administrators verify document authenticity and can **Approve**, **Reject**, or **Request Changes** with required audit notes.
3. **Donor Lifecycle Feedback & Resubmission**:
   - If changes are requested or documents are rejected, the donor sees an interactive banner on their Donor Hub with the administrator's feedback.
   - The donor can click "Edit & Resubmit Documents" to correct their UID, PAN, or re-upload documents, seamlessly submitting them back for administrator review.

---

## 8. Multi-Factor Smart Match Recommendation Algorithm

The DonateBridge Smart Match Engine calculates a deterministic affinity score (0% to 100%) connecting donor items to active NGO needs:

- **Category Compatibility (30 pts)**: Strict semantic match between donor item category (clothing, food, books, medical, furniture, electronics) and active NGO needs.
- **Geographical Proximity (20 pts)**: Haversine distance calculation between donor pickup coordinates and NGO facility location. Closer dispatches receive higher scores.
- **Need Urgency Level (15 pts)**: Critical and emergency demands are prioritized (Critical = 15 pts, High = 12 pts, Medium = 8 pts, Low = 5 pts).
- **NGO Trust Index (10 pts)**: Vetted NGOs with proven delivery track records, verified documents, and community ratings receive higher ranking.
- **Quantity Alignment & Freshness (25 pts)**: Compares available quantity to required need volume, factoring in posting recency.

---

## 9. Real-Time Chat & Automated Notification System

- **Direct Two-Way Messaging**: Donors and approved NGOs communicate directly via WebSocket channels (`/ws/chat/{channel_id}/`) to coordinate pickup logistics, box packing, and scheduling.
- **Automated Event Notifications**: Critical platform milestones (NGO audit approval, donation claims, courier dispatch, in-transit updates, delivery confirmation) automatically trigger system notifications delivered in real time over `/ws/notifications/` with desktop toasts and unread counters.

