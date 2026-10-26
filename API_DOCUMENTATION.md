# DonateBridge — API Reference Documentation

This document provides a detailed technical reference for the **DonateBridge REST API** endpoints implemented in the Django REST Framework backend.

---

## 1. Base URL & Authentication Headers

* **Base URL:** `http://127.0.0.1:8000`
* **Authentication Scheme:** JSON Web Tokens (SimpleJWT Bearer Scheme)
* **Header Format:**
  ```http
  Authorization: Bearer <your_access_token>
  Content-Type: application/json
  ```

---

## 2. Authentication & Account Endpoints (`/api/auth/`)

### 2.1 User Registration
* **Endpoint:** `POST /api/auth/register/`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123!",
    "role": "donor"
  }
  ```
* **Response (HTTP 201 Created):**
  ```json
  {
    "message": "User registered successfully. An OTP has been sent to your email.",
    "user_id": 14,
    "email": "john@example.com"
  }
  ```

---

### 2.2 Verify 6-Digit Email OTP
* **Endpoint:** `POST /api/auth/verify-otp/`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "otp": "492815"
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "message": "Email verified successfully.",
    "access": "<jwt_access_token>",
    "refresh": "<jwt_refresh_token>",
    "user": {
      "id": 14,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "donor",
      "is_verified": true
    }
  }
  ```

---

### 2.3 User Login
* **Endpoint:** `POST /api/auth/login/`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
* **Response (HTTP 200 OK):** Returns JWT access and refresh token pair along with user profile details.

---

### 2.4 Profile Management
* **Endpoint:** `GET /api/users/me/` | `PATCH /api/users/me/`
* **Auth Required:** Yes (`Bearer <token>`)
* **Purpose:** Retrieve or update current user profile, phone number, address, pincode, latitude, and longitude.

---

## 3. NGO Management Endpoints (`/api/ngos/` & `/api/needs/`)

### 3.1 List Approved NGOs
* **Endpoint:** `GET /api/ngos/`
* **Auth Required:** Yes
* **Response (HTTP 200 OK):** Returns a list of verified NGOs with trust scores and locations.

### 3.2 Broadcast NGO Requirements
* **Endpoint:** `POST /api/needs/`
* **Auth Required:** Yes (NGO Role Only)
* **Request Body:**
  ```json
  {
    "item": "Winter Blankets",
    "category": "clothing",
    "quantity": 50,
    "urgency": "High"
  }
  ```

---

## 4. Donation & Smart Match Endpoints (`/api/donations/`)

### 4.1 Post Donation Listing
* **Endpoint:** `POST /api/donations/`
* **Auth Required:** Yes (Donor Role Only)
* **Request Body:**
  ```json
  {
    "item_name": "Warm Jackets",
    "category": "clothing",
    "quantity": 10,
    "pickup_lat": 21.1458,
    "pickup_lng": 79.0882
  }
  ```
* **Response (HTTP 201 Created):** Returns created listing and deterministic Smart Match scoring rankings for matching NGO demands.

---

## 5. Chat & Messaging Endpoints (`/api/chat/`)

### 5.1 Discover Available Contacts
* **Endpoint:** `GET /api/chat/contacts/`
* **Auth Required:** Yes
* **Purpose:** Donors discover verified NGOs; NGOs discover registered donors.

### 5.2 List Channel Messages
* **Endpoint:** `GET /api/chat/channels/<channel_id>/messages/`
* **Auth Required:** Yes
* **Response (HTTP 200 OK):** Returns stored message history for authorized channel members.

---

## 6. Local AI Assistant & RAG Endpoints (`/api/ai/`)

### 6.1 Check Ollama Health
* **Endpoint:** `GET /api/ai/health/`
* **Auth Required:** No
* **Response (HTTP 200 OK):**
  ```json
  {
    "status": "online",
    "model": "llama3:latest"
  }
  ```

### 6.2 Query RAG AI Assistant
* **Endpoint:** `POST /api/ai/donation-assistant/`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "message": "How does NGO verification work?",
    "lat": 21.1458,
    "lng": 79.0882,
    "history": []
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "type": "knowledge",
    "explanation": "NGO verification on DonateBridge is a manual process that involves reviewing submitted government registration documents to ensure legitimacy...",
    "sources": [
      {
        "source": "PROJECT_CONTEXT.md",
        "section": "NGO Verification & Profile System"
      }
    ]
  }
  ```

---

## 7. Location Endpoints (`/api/location/`)

### 7.1 Reverse Geocode Coordinates
* **Endpoint:** `GET /api/location/reverse-geocode/?lat=21.1458&lng=79.0882`
* **Auth Required:** No
* **Response (HTTP 200 OK):** Returns resolved city, state, district, pincode, and road address from Nominatim OpenStreetMap API.

---

## 8. Feedback Endpoint (`/api/feedback/`)

### 8.1 Submit User Feedback
* **Endpoint:** `POST /api/feedback/`
* **Auth Required:** Yes
* **Request Body:**
  ```json
  {
    "subject": "Platform Navigation",
    "rating": 5,
    "message": "The interactive map feature is very helpful for discovering nearby NGOs!"
  }
  ```
* **Response (HTTP 200 OK):** Dispatches email to `testgmail498@gmail.com` via Gmail SMTP.
