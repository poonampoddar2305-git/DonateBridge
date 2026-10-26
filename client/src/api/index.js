/**
 * DonateBridge - Centralized API Layer
 * 
 * All API calls go through this file.
 * The `api` axios instance is exported from GlobalStateContext with JWT interceptors.
 */

import { api } from '../context/GlobalStateContext';

// ─────────────────────────────────────────────
// AUTH APIs
// ─────────────────────────────────────────────

export const authAPI = {
  login: (email, password) =>
    api.post('/api/auth/login/', { email, password }),

  register: (username, email, password, role = 'donor', avatar = '👤', locationData = {}) =>
    api.post('/api/auth/register/', { username, email, password, role, avatar, ...locationData }),


  refresh: (refresh) =>
    api.post('/api/auth/refresh/', { refresh }),

  sendOTP: (email, is_signup = false) =>
    api.post('/api/auth/resend-otp/', { email, is_signup }),

  verifyOTP: (email, code) =>
    api.post('/api/auth/verify-otp/', { email, code }),

  forgotPassword: (email) =>
    api.post('/api/auth/forgot-password/', { email }),

  resetPassword: (email, code, new_password) =>
    api.post('/api/auth/reset-password/', { email, code, new_password }),

  getMe: () =>
    api.get('/api/users/me/'),

  updateMe: (data) =>
    api.patch('/api/users/me/', data),

  resubmitVerification: (data) =>
    api.post('/api/users/resubmit-verification/', data),

  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─────────────────────────────────────────────
// NGO APIs
// ─────────────────────────────────────────────

export const ngoAPI = {
  list: (params = {}) =>
    api.get('/api/ngos/', { params }),

  getById: (id) =>
    api.get(`/api/ngos/${id}/`),

  getMe: () =>
    api.get('/api/ngos/me/'),

  register: (data) =>
    api.post('/api/ngos/register/', data),

  createReview: (ngoId, rating, comment) =>
    api.post(`/api/ngos/${ngoId}/reviews/`, { rating, comment }),

  // Needs
  getNeeds: (params = {}) =>
    api.get('/api/needs/', { params }),

  createNeed: (data) =>
    api.post('/api/needs/', data),

  updateNeed: (id, data) =>
    api.patch(`/api/needs/${id}/`, data),

  deleteNeed: (id) =>
    api.delete(`/api/needs/${id}/`),

  getAnalytics: () =>
    api.get('/api/ngos/analytics/'),

  // Campaigns
  getCampaigns: () =>
    api.get('/api/campaigns/'),

  // Volunteer Events
  getEvents: (params = {}) =>
    api.get('/api/events/', { params }),

  createEvent: (data) =>
    api.post('/api/events/', data),

  // Volunteer Registration
  registerForEvent: (eventId) =>
    api.post('/api/volunteer-registrations/', { event: eventId }),

  getMyRegistrations: () =>
    api.get('/api/volunteer-registrations/'),
};

// ─────────────────────────────────────────────
// DONATION APIs
// ─────────────────────────────────────────────

export const donationAPI = {
  list: (params = {}) =>
    api.get('/api/donations/', { params }),

  getById: (id) =>
    api.get(`/api/donations/${id}/`),

  getMyDonations: () =>
    api.get('/api/donations/my_donations/'),

  create: (data) =>
    api.post('/api/donations/', data),

  update: (id, data) =>
    api.patch(`/api/donations/${id}/`, data),

  claim: (id) =>
    api.post(`/api/donations/${id}/claim/`),

  toggleWishlist: (id) =>
    api.post(`/api/donations/${id}/wishlist/`),

  // Smart Matching
  getSmartMatchesForDonation: (id) =>
    api.get(`/api/smart-match/donation/${id}/`),

  getNgoSmartMatches: () =>
    api.get('/api/smart-match/ngo/'),

  // Community Challenges
  getChallenges: (activeOnly = false) =>
    api.get('/api/challenges/', { params: activeOnly ? { active: 'true' } : {} }),
};

// ─────────────────────────────────────────────
// LOGISTICS APIs
// ─────────────────────────────────────────────

export const logisticsAPI = {
  getTracking: (donationId) =>
    api.get(`/api/tracking/${donationId}/`),

  updateStep: (donationId, step) =>
    api.patch(`/api/tracking/${donationId}/step/`, { step }),

  verifyQR: (donationId, token) =>
    api.post(`/api/tracking/${donationId}/verify-qr/`, { token }),
};

// ─────────────────────────────────────────────
// CHAT APIs
// ─────────────────────────────────────────────

export const chatAPI = {
  getContacts: (search = '') =>
    api.get('/api/chat/contacts/', { params: search ? { search } : {} }),

  getChannels: () =>
    api.get('/api/chat/channels/'),

  createChannel: (otherUserId) =>
    api.post('/api/chat/channels/', { other_user_id: otherUserId }),

  getMessages: (channelId) =>
    api.get(`/api/chat/channels/${channelId}/messages/`),

  sendMessage: (channelId, text, messageType = 'text', mediaUrl = null, lat = null, lng = null) =>
    api.post(`/api/chat/channels/${channelId}/messages/`, {
      text,
      message_type: messageType,
      media_url: mediaUrl,
      lat,
      lng,
    }),
};

// ─────────────────────────────────────────────
// MODERATION / ADMIN APIs
// ─────────────────────────────────────────────

export const moderationAPI = {
  getPendingNGOs: (status = 'pending') =>
    api.get('/api/admin/ngos/pending/', { params: { status } }),

  getNGO: (id) =>
    api.get(`/api/admin/ngos/${id}/`),

  auditNGO: (id, action, reason = '') =>
    api.post(`/api/admin/ngos/${id}/audit/`, { action, reason }),

  getPendingDonors: (status = 'pending') =>
    api.get('/api/admin/donors/pending/', { params: { status } }),

  getDonor: (id) =>
    api.get(`/api/admin/donors/${id}/`),

  auditDonor: (id, action, reason = '') =>
    api.post(`/api/admin/donors/${id}/audit/`, { action, reason }),

  getPendingDonations: () =>
    api.get('/api/admin/donations/pending/'),

  auditDonation: (id, action, reason = '') =>
    api.post(`/api/admin/donations/${id}/audit/`, { action, reason }),

  getFraudLogs: () =>
    api.get('/api/admin/fraud-logs/'),

  dismissFraudLog: (id) =>
    api.delete(`/api/admin/fraud-logs/${id}/`),

  getMetrics: () =>
    api.get('/api/admin/metrics/'),
};

// ─────────────────────────────────────────────
// AI ASSISTANT APIs
// ─────────────────────────────────────────────

export const aiAPI = {
  donationAssistant: (message, lat = null, lng = null, history = []) =>
    api.post('/api/ai/donation-assistant/', { message, lat, lng, history }),

  checkHealth: () =>
    api.get('/api/ai/health/'),
};

// ─────────────────────────────────────────────
// NOTIFICATION APIs
// ─────────────────────────────────────────────

export const notificationAPI = {
  getAll: (type = null) =>
    api.get('/api/notifications/', { params: type ? { type } : {} }),

  markRead: (id) =>
    api.patch(`/api/notifications/${id}/read/`),

  markAllRead: () =>
    api.post('/api/notifications/mark-all-read/'),
};

export const locationAPI = {
  reverseGeocode: (lat, lng) =>
    api.get('/api/location/reverse-geocode/', { params: { lat, lng } }),
};

// ─────────────────────────────────────────────
// HELPER: handle API errors gracefully
// ─────────────────────────────────────────────


export const getApiError = (error) => {
  if (error?.response?.data) {
    const data = error.response.data;
    // DRF returns errors as { field: [msg] } or { detail: msg } or { error: msg }
    if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : String(data.non_field_errors);
    // Field errors - grab the first one
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const fieldName = firstKey.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
      const msg = Array.isArray(val) ? val[0] : String(val);
      return `${fieldName}: ${msg}`;
    }
  }
  return error?.message || 'An unexpected error occurred. Please try again.';
};

