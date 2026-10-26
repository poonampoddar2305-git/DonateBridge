# DonateBridge — Master Viva Questions & Answers Guide

This document contains **50 Project-Specific Viva Questions and Answers**, hard follow-up questions, scenario "what-if" analyses, killer examination questions, and a 5-minute **Quick Revision Sheet** for B.Tech final-year project viva evaluation.

---

## 1. Project Basics (Q1 – Q10)

### Q1: What is DonateBridge?
**Answer:** DonateBridge is a full-stack web application designed to coordinate non-monetary physical item donations between individual donors and verified Non-Governmental Organizations (NGOs). It incorporates email OTP verification, multi-factor smart matching, coordinate-based location selection, WebSocket text chat, and a local dual-retrieval RAG AI assistant.

### Q2: What real-world problem does DonateBridge solve?
**Answer:** It addresses resource fragmentation, uncoordinated donations, and lack of direct communication between donors and verified NGOs. Donors often have surplus goods but don't know which local NGOs urgently require them, while NGOs face supply shortages.

### Q3: Who are the primary user roles in the application?
**Answer:** The system supports three roles:
1. **Donor:** Offers item listings, views Smart Matches, chats with NGOs, and uses the AI assistant.
2. **NGO / Foundation:** Broadcasts urgent item needs, submits legal documents for verification, and coordinates pickup via text chat.
3. **Administrator:** Audits NGO registration filings and manages platform moderation.

### Q4: Why is physical handover used instead of an internal courier delivery service?
**Answer:** DonateBridge explicitly focuses on direct donor-NGO collaboration. Peer-to-peer physical handover reduces operational logistics costs, prevents courier service failures in local academic prototypes, and encourages direct community connection.

### Q5: What makes DonateBridge different from general donation websites?
**Answer:** DonateBridge integrates multi-factor deterministic Smart Matching (category, proximity, urgency, trust score), live WebSocket text chat, coordinate geocoding, and a local grounded RAG AI assistant (`llama3:latest`) into a single full-stack prototype.

### Q6: What algorithms or custom logic did you implement?
**Answer:** We implemented:
1. **Multi-Factor Smart Match Engine:** Weighted formula combining category fit, Haversine coordinate distance, demand urgency, and NGO trust score.
2. **Dual-Retrieval RAG Engine:** Hybrid retrieval switching between vector search for static knowledge and Django ORM queries for live database records.

### Q7: Why did you build a web application instead of a mobile app?
**Answer:** A React single-page web application provides cross-platform accessibility across mobile browsers and desktops without requiring platform-specific app store compilation during academic demonstration.

### Q8: What database is used in the project?
**Answer:** PostgreSQL Server 17 (installed natively on localhost) managed via Django ORM and inspected via pgAdmin 4.

### Q9: How is authentication secured?
**Answer:** Registration requires 6-digit OTP verification delivered via Gmail SMTP. Authenticated sessions issue JSON Web Tokens (SimpleJWT Access/Refresh pair). Passwords are hashed using PBKDF2 with SHA256.

### Q10: What AI technology is used in the project?
**Answer:** We use local Ollama running the `llama3:latest` LLM model paired with a custom dense vector store (`media/vector_store/index.json`) for grounded Retrieval-Augmented Generation (RAG).

---

## 2. Architecture & Technology Stack (Q11 – Q20)

### Q11: Explain the overall system architecture.
**Answer:** DonateBridge uses a 3-tier architecture:
1. **Frontend:** React 19 + Vite SPA with Leaflet Maps and custom CSS.
2. **Backend:** Django 5.2 REST Framework + Daphne ASGI server for WebSockets.
3. **Database & AI:** PostgreSQL 17 database, custom JSON vector index, and local Ollama LLM server.

### Q12: Why did you choose React over plain HTML/JS or Angular?
**Answer:** React's component-based virtual DOM structure allows efficient re-rendering of interactive elements like real-time chat messages, interactive Leaflet maps, and dynamic Smart Match score visualizers.

### Q13: Why did you choose Django and Django REST Framework?
**Answer:** Django provides robust built-in ORM security (protection against SQL injection and CSRF), clean application modularity, powerful admin management, and seamless ASGI support via Daphne.

### Q14: How does the frontend communicate with the backend?
**Answer:** HTTP requests use Axios to communicate with Django REST endpoints (`/api/`). Real-time text messaging uses WebSockets (`ws://localhost:8000/ws/chat/`).

### Q15: How are WebSocket connections handled in Django?
**Answer:** We deploy **Daphne ASGI server** alongside Django Channels. WebSockets connect to `ChatConsumer`, which verifies JWT credentials, attaches the socket to a channel group, and broadcasts messages in real-time.

### Q16: Why did you use PostgreSQL instead of SQLite?
**Answer:** PostgreSQL handles concurrent database reads/writes required during real-time chat and multi-user interactions, supports robust relational constraints, and represents production-grade database architecture suitable for B.Tech evaluation.

### Q17: What is the purpose of pgAdmin 4 in your project?
**Answer:** pgAdmin 4 provides a visual GUI to inspect raw PostgreSQL database tables, verify schema constraints, run raw SQL diagnostic queries, and monitor active database connections during project demonstration.

### Q18: How does the system prevent unauthorized access to API endpoints?
**Answer:** API endpoints require a valid JWT `Authorization: Bearer <token>` header. Views verify the user's authenticated database role (`request.user.role`) before granting access.

### Q19: What is Daphne and why is it needed?
**Answer:** Daphne is an ASGI (Asynchronous Server Gateway Interface) server capable of handling both HTTP and persistent WebSocket connections, allowing real-time chat alongside standard REST views.

### Q20: How are environment variables managed?
**Answer:** All database passwords, Django secret keys, and SMTP credentials are stored in `server/.env`, which is isolated from Git using `.gitignore`.

---

## 3. Database & Relational Schema (Q21 – Q28)

### Q21: What are the main tables in your PostgreSQL database?
**Answer:** `authentication_customuser`, `authentication_profile`, `ngo_ngo`, `ngo_ngodocument`, `ngo_need`, `donation_donation`, `chat_chatchannel`, `chat_chatmember`, `chat_chatmessage`, and `notification_notification`.

### Q22: How is the User-NGO relationship modeled?
**Answer:** `NGO` has a `OneToOneField` linking to `CustomUser` (`user_id`), ensuring each NGO organization is managed by exactly one user account with `role='ngo'`.

### Q23: How do database migrations work in Django?
**Answer:** `python manage.py makemigrations` inspects model changes and generates Python migration scripts. `python manage.py migrate` translates those scripts into SQL DDL statements (`CREATE TABLE`, `ALTER TABLE`) and executes them against PostgreSQL.

### Q24: What happens if an NGO user is deleted from the database?
**Answer:** `on_delete=models.CASCADE` is configured on dependent models (`NGO`, `Need`, `NGODocument`), ensuring related records are automatically purged to prevent orphaned foreign keys.

### Q25: How do you prevent duplicate user registrations?
**Answer:** `username` and `email` fields on `CustomUser` have `unique=True` constraints enforced at both the database level and DRF serializer level.

### Q26: How are geographic coordinates stored in PostgreSQL?
**Answer:** `lat` and `lng` are stored as `FloatFields` (Double Precision) with serializer bounds validation (-90.0 to 90.0 for latitude, -180.0 to 180.0 for longitude).

### Q27: How does database seeding work in your project?
**Answer:** `python manage.py seed_db` programmatically creates admin, donor, and NGO test accounts, uploads sample verification documents, and creates active needs centered around Nagpur, Maharashtra.

### Q28: How would you scale the database if traffic increases?
**Answer:** Read-heavy queries (like NGO search and demand listings) can be scaled by adding PostgreSQL Read Replicas, database connection pooling (PgBouncer), and indexing frequently searched columns (`category`, `verification_status`).

---

## 4. Authentication & Security (Q29 – Q35)

### Q29: Step-by-step, how does user registration work?
**Answer:**
1. User submits details to `POST /api/auth/register/`.
2. Backend creates an unverified account (`is_verified=False`).
3. Server generates a 6-digit OTP and stores it in cache (5 min TTL).
4. OTP is sent to user's email via Gmail SMTP.
5. User enters code in `OtpInputField`.
6. `POST /api/auth/verify-otp/` matches OTP, marks account `is_verified=True`, and returns SimpleJWT tokens.

### Q30: Why is the OTP code not returned in the API response?
**Answer:** Returning OTP codes in API responses allows attackers to inspect network payloads and bypass email verification entirely. In DonateBridge, the OTP exists **only** in server RAM cache and the recipient's email inbox.

### Q31: How is OTP expiration enforced?
**Answer:** Django cache stores the OTP key with a 300-second (5-minute) TTL. Once the time elapses, the cache automatically drops the key, causing verification attempts to fail with `HTTP 400 (Expired OTP)`.

### Q32: What is the 60-second OTP resend cooldown?
**Answer:** To prevent email spam and SMTP quota exhaustion, the backend tracks `otp_sent_timestamp`. Requesting a new OTP within 60 seconds returns `HTTP 429 Too Many Requests`.

### Q33: How are user passwords protected?
**Answer:** Django hashes passwords using **PBKDF2 with SHA256** and 600,000 salt iterations before storing them in PostgreSQL. Plaintext passwords are never saved.

### Q34: What is the difference between Access Tokens and Refresh Tokens in your project?
**Answer:** Access Tokens authorize API requests and expire after 60 minutes. Refresh Tokens are longer-lived (7 days) and are sent to `/api/auth/token/refresh/` to obtain a new access token without re-entering credentials.

### Q35: How does the system prevent an NGO user from acting as a Donor?
**Answer:** DRF permission classes inspect `request.user.role`. If an NGO user attempts to post a donation offer on a donor-only endpoint, the view returns `HTTP 403 Forbidden`.

---

## 5. Communication & Location (Q36 – Q44)

### Q36: How does contact discovery work in the chat system?
**Answer:** `GET /api/chat/contacts/` checks the authenticated user's role. Donors receive a list of approved NGOs; NGOs receive a list of registered donors.

### Q37: What happens when a chat message arrives while the user is on another page?
**Answer:** The active WebSocket connection in `GlobalStateContext` receives the incoming message frame, triggers a live toast notification (`Message Arrived from [Sender]`), and updates the unread count in `NotificationCenter`.

### Q38: Why was video calling removed from the project?
**Answer:** Video/phone calls require heavy WebRTC infrastructure and external signaling servers. Removing calls in favor of persistent WebSocket text messaging simplified the platform and reduced external system dependencies.

### Q39: How does location selection work on the frontend?
**Answer:** Users can use browser GPS geolocation or click any location on the interactive Leaflet map component. The component captures `lat`/`lng` coordinates and populates the location form.

### Q40: What is reverse-geocoding and how is it used in DonateBridge?
**Answer:** Reverse-geocoding converts numeric coordinates into human-readable addresses. DonateBridge calls OpenStreetMap's Nominatim API via `/api/location/reverse-geocode/` to auto-populate City, State, District, and Pincode.

### Q41: Why is Nagpur, Maharashtra prioritized in sample data?
**Answer:** Sample test data (`seed_db`) centers around Nagpur (`21.1458, 79.0882`) to provide realistic local spatial proximity testing during project demonstration. Real users can select any global coordinates.

### Q42: How does the Smart Match algorithm measure distance?
**Answer:** It uses the **Haversine formula** to calculate great-circle distance between donor pickup coordinates and NGO headquarters coordinates in kilometers.

### Q43: How are chat channels secured against eavesdropping?
**Answer:** Before returning channel messages or accepting WebSocket connections, the backend checks `chat_chatmember` to verify that `request.user` is an authorized participant in that specific channel.

### Q44: What happens if a user enters an invalid mobile number?
**Answer:** Frontend inputs enforce `maxLength=10` and numeric key filtering. The backend serializer validates `^[6-9]\d{9}$` and rejects non-matching strings with `HTTP 400`.

---

## 6. AI, RAG & Ollama Integration (Q45 – Q50)

### Q45: What is Ollama?
**Answer:** Ollama is an open-source local LLM runner that executes AI models directly on host system hardware without requiring paid third-party API subscriptions.

### Q46: What LLM model is used and why?
**Answer:** We use **`llama3:latest`** (8-billion parameter model), which provides strong reasoning and natural text generation capabilities suitable for local academic prototypes.

### Q47: What is Retrieval-Augmented Generation (RAG)?
**Answer:** RAG is an AI technique that retrieves relevant factual context from external documents or database tables and injects it into the LLM's prompt before generation, preventing AI hallucinations.

### Q48: How does vector ingestion work in your project?
**Answer:** Running `python manage.py ingest_knowledge` parses `PROJECT_CONTEXT.md` and `README.md` into semantic section chunks, computes vector embeddings, and stores them in `server/media/vector_store/index.json`.

### Q49: How does the AI Assistant distinguish between documentation questions and live database questions?
**Answer:** The `RAGService` query classifier inspects keywords. Questions about policies or verification search the vector index; questions asking *"Which NGOs need blankets?"* query live PostgreSQL records (`Need` and `NGO` models).

### Q50: What happens if the local Ollama server is offline?
**Answer:** The AI Assistant catches the connection error and gracefully falls back to grounded context synthesis, displaying top retrieved documentation chunks without breaking the user interface.

---

## 7. Presentation "Killer Questions" & Hard Scenarios

### K1: "Why should I trust your role detection if it's sent from the client?"
**Response:** We do not trust client-side role claims. Role authorization is enforced strictly on the backend by inspecting `request.user.role` from the authenticated database record tied to the verified JWT token.

### K2: "Why use RAG if Ollama already knows general information?"
**Response:** General LLMs do not know project-specific business rules, verification requirements, or live database inventory. RAG supplies exact, real-time context from our documentation and PostgreSQL database.

### K3: "What if two users create a chat channel at the same time?"
**Response:** `ChatChannel` creation checks for existing `chat_chatmember` pairings first. If a channel already exists between two users, the backend returns the existing channel ID rather than creating a duplicate.

### K4: "Is your system scalable to millions of users?"
**Response:** The core architecture is decoupled and horizontally scalable: React SPA on CDN, Django API behind Gunicorn/Daphne load balancers, PostgreSQL with read replicas, and Redis caching for OTP and WebSockets.

### K5: "What is your project's biggest limitation?"
**Response:** Local Ollama inference requires machine hardware resources (8GB+ RAM). In production hosting, LLM inference would be offloaded to dedicated GPU microservices.

---

## 8. 5-Minute Quick Revision Sheet

* **Project Name:** DonateBridge
* **Frontend:** React 19, Vite, Leaflet Maps, Custom CSS (`client/`)
* **Backend:** Django 5.2, Django REST Framework, Daphne ASGI (`server/`)
* **Database:** PostgreSQL Server 17 (`donatebridge_db`) managed via Django ORM & pgAdmin 4
* **Auth & Verification:** SimpleJWT + 6-digit Email OTP via Gmail SMTP (300s TTL, 60s cooldown, zero log exposure)
* **Smart Matching:** Deterministic multi-factor scoring (Category 30pt, Distance 20pt, Urgency 15pt, Trust 10pt, Quantity 25pt)
* **Chat System:** Daphne ASGI WebSockets (`ws://`) + REST fallback with real-time arrival toast alerts
* **Location Intelligence:** Coordinate storage (`lat`/`lng`), Leaflet map picker, and Nominatim OpenStreetMap reverse-geocoding
* **Local AI & RAG:** Ollama (`llama3:latest`) + Dense Vector Store (`media/vector_store/index.json`) + Dual-path RAG (docs vs live DB)
* **Test Verification:** 46/46 Django unit tests passing (`OK`), Vite production build clean (`built in 882ms`)
