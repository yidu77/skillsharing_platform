import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — clear token and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sb_token')
      localStorage.removeItem('sb_user')
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ─── Users ──────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  getReviews: (id) => api.get(`/users/${id}/reviews`),
  updateInterests: (interests) => api.put('/users/me/interests', { interests }),
}

// ─── Skills ─────────────────────────────────────────────────────────────────
export const skillsAPI = {
  getCategories: () => api.get('/skills/categories'),
  getAll: (params) => api.get('/skills', { params }),
  getMyTeaching: () => api.get('/skills/my/teaching'),
  getMyLearning: () => api.get('/skills/my/learning'),
  addTeaching: (data) => api.post('/skills/my/teaching', data),
  updateTeaching: (id, data) => api.put(`/skills/my/teaching/${id}`, data),
  removeTeaching: (id) => api.delete(`/skills/my/teaching/${id}`),
  addLearning: (data) => api.post('/skills/my/learning', data),
  removeLearning: (id) => api.delete(`/skills/my/learning/${id}`),
}

// ─── Matches ────────────────────────────────────────────────────────────────
export const matchesAPI = {
  get: () => api.get('/matches'),
}

// ─── Requests ───────────────────────────────────────────────────────────────
export const requestsAPI = {
  getAll: (params) => api.get('/requests', { params }),
  create: (data) => api.post('/requests', data),
  accept: (id) => api.put(`/requests/${id}/accept`),
  decline: (id) => api.put(`/requests/${id}/decline`),
  cancel: (id) => api.delete(`/requests/${id}`),
}

// ─── Sessions ───────────────────────────────────────────────────────────────
export const sessionsAPI = {
  getAll: (params) => api.get('/sessions', { params }),
  propose: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  confirm: (id) => api.put(`/sessions/${id}/confirm`),
  counter: (id, data) => api.put(`/sessions/${id}/counter`, data),
  complete: (id) => api.put(`/sessions/${id}/complete`),
  cancel: (id) => api.put(`/sessions/${id}/cancel`),
  noShow: (id) => api.put(`/sessions/${id}/no-show`),
}

// ─── Reviews ────────────────────────────────────────────────────────────────
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getForSession: (sessionId) => api.get(`/reviews/session/${sessionId}`),
  checkReview: (sessionId) => api.get(`/reviews/session/${sessionId}/check`),
}

// ─── Reports ────────────────────────────────────────────────────────────────
export const reportsAPI = {
  create: (data) => api.post('/reports', data),
}

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/read-all'),
}

// ─── Admin ──────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  toggleSuspension: (id, data) => api.put(`/admin/users/${id}/suspension`, data),
  getSkills: () => api.get('/admin/skills'),
  createCategory: (data) => api.post('/admin/categories', data),
  getReports: (params) => api.get('/admin/reports', { params }),
  updateReport: (id, data) => api.put(`/admin/reports/${id}`, data),
}

export default api
