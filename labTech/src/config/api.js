const BASE_URL = 'http://192.168.1.17:5000';

export const API_ENDPOINTS = {
  PATIENT_SIGNUP: `${BASE_URL}/api/auth/signup-patient`,
  LOGIN: `${BASE_URL}/api/auth/login`,
  APPOINTMENTS_CREATE: `${BASE_URL}/api/appointments`,
  APPOINTMENTS_MINE: `${BASE_URL}/api/appointments/mine`,
  APPOINTMENTS_ADMIN_LIST: `${BASE_URL}/api/appointments/admin`,
  APPOINTMENTS_ADMIN_UPDATE_STATUS: (id) => `${BASE_URL}/api/appointments/admin/${id}/status`,
  APPOINTMENTS_PATIENT_CANCEL: (id) => `${BASE_URL}/api/appointments/mine/${id}/cancel`,
  NOTIFICATIONS_MINE: `${BASE_URL}/api/notifications/mine`,
  NOTIFICATIONS_MARK_ALL_READ: `${BASE_URL}/api/notifications/mine/read-all`,
  NOTIFICATIONS_MARK_READ: (id) => `${BASE_URL}/api/notifications/mine/${id}/read`,
  NOTIFICATIONS_CREATE: `${BASE_URL}/api/notifications`,
  PROFILE_ME: `${BASE_URL}/api/profile/me`,
  PROFILE_PUSH_TOKEN: `${BASE_URL}/api/profile/push-token`,
};

export default {
  BASE_URL,
};
