/**
 * Xeno CRM - Frontend API Service
 * 
 * Communicates with the Flask CRM backend.
 * Requests are proxied from the Vite server to http://localhost:5000.
 */

//const BASE_URL = '/api';
const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errData.message || errorMessage;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  // --- Dashboard ---
  getDashboardStats: async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    return handleResponse(res);
  },

  seedDatabase: async () => {
    const res = await fetch(`${BASE_URL}/data/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // --- Customers ---
  getCustomers: async ({ page = 1, perPage = 20, search = '', city = '', ageGroup = '', minSpent = '' } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (search) params.append('search', search);
    if (city) params.append('city', city);
    if (ageGroup) params.append('age_group', ageGroup);
    if (minSpent) params.append('min_spent', minSpent);

    const res = await fetch(`${BASE_URL}/customers?${params.toString()}`);
    return handleResponse(res);
  },

  getCustomer: async (id) => {
    const res = await fetch(`${BASE_URL}/customers/${id}`);
    return handleResponse(res);
  },

  // --- Segments ---
  getSegments: async () => {
    const res = await fetch(`${BASE_URL}/segments`);
    return handleResponse(res);
  },

  createSegment: async (segmentData) => {
    const res = await fetch(`${BASE_URL}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segmentData),
    });
    return handleResponse(res);
  },

  deleteSegment: async (id) => {
    const res = await fetch(`${BASE_URL}/segments/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  getSegmentCustomers: async (id) => {
    const res = await fetch(`${BASE_URL}/segments/${id}/customers`);
    return handleResponse(res);
  },

  // --- Campaigns ---
  getCampaigns: async () => {
    const res = await fetch(`${BASE_URL}/campaigns`);
    return handleResponse(res);
  },

  createCampaign: async (campaignData) => {
    const res = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData),
    });
    return handleResponse(res);
  },

  getCampaign: async (id) => {
    const res = await fetch(`${BASE_URL}/campaigns/${id}`);
    return handleResponse(res);
  },

  getCampaignCommunications: async (id) => {
    const res = await fetch(`${BASE_URL}/campaigns/${id}/communications`);
    return handleResponse(res);
  },

  sendCampaign: async (id) => {
    const res = await fetch(`${BASE_URL}/campaigns/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // --- AI Co-pilot ---
  suggestSegment: async (userPrompt) => {
    const res = await fetch(`${BASE_URL}/ai/suggest-segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt }),
    });
    return handleResponse(res);
  },

  draftMessage: async ({ segmentId, channel, prompt, subject = '' }) => {
    const res = await fetch(`${BASE_URL}/ai/draft-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment_id: segmentId,
        channel,
        goal: prompt,
        subject,
      }),
    });
    return handleResponse(res);
  },

  getCampaignInsights: async (campaignId) => {
    const res = await fetch(`${BASE_URL}/ai/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    return handleResponse(res);
  },
};
// Keep backend alive - ping every 10 minutes
setInterval(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`).catch(() => { });
}, 600000);