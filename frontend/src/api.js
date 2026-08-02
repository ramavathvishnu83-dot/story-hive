import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data);
export const login    = (data) => api.post('/auth/login', data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers       = ()             => api.get('/users');
export const getUser        = (id)           => api.get(`/users/${id}`);
export const createUser     = (data)         => api.post('/users', data);
export const updateUser     = (id, data)     => api.patch(`/users/${id}`, data);
export const uploadProfilePic = (id, imageData) => api.post(`/users/${id}/profile-pic`, { imageData });
export const searchUsers    = (q)            => api.get('/users/search', { params: { q } });
export const toggleFollow   = (fId, tId)     => api.post('/users/follow', { followerId: fId, targetId: tId });
export const toggleUserLike = (lId, tId)     => api.post('/users/like', { likerId: lId, targetId: tId });
export const reviewUser     = (id, data)     => api.post(`/users/${id}/review`, data);

// ── Stories ───────────────────────────────────────────────────────────────────
export const getStories      = (params)      => api.get('/stories', { params });
export const getStory        = (id, rId)     => api.get(`/stories/${id}`, { params: { requesterId: rId } });
export const createStory     = (data)        => api.post('/stories', data);
export const updateStory     = (id, data)    => api.put(`/stories/${id}`, data);
export const getAuthorStories= (authorId)    => api.get(`/stories/author/${authorId}`);
export const toggleStoryLike = (uId, sId)    => api.post('/stories/like', { userId: uId, storyId: sId });
export const deleteStory     = (id, authorId)=> api.delete(`/stories/${id}`, { params: { authorId } });

// ── Deals ─────────────────────────────────────────────────────────────────────
export const getDeals    = (userId)  => api.get('/deals', { params: { userId } });
export const createDeal  = (data)    => api.post('/deals/create', data);
export const confirmDeal = (data)    => api.post('/deals/confirm', data);
export const cancelDeal  = (data)    => api.post('/deals/cancel', data);

// ── Story Chat (per-story) ────────────────────────────────────────────────────
export const getChat          = (storyId)           => api.get(`/chat/${storyId}`);
export const sendMessage      = (data)              => api.post('/chat/send', data);
export const editChatMessage  = (storyId, msgId, senderId, text) =>
  api.patch(`/chat/${storyId}/messages/${msgId}`, { senderId, text });
export const deleteChatMessage= (storyId, msgId, senderId) =>
  api.delete(`/chat/${storyId}/messages/${msgId}`, { params: { senderId } });

// ── Direct Messages ───────────────────────────────────────────────────────────
export const getDMThreads  = (userId)              => api.get('/dms', { params: { userId } });
export const getDMThread   = (userId, otherId)     => api.get('/dms/thread', { params: { userId, otherId } });
export const getDMById     = (threadId, userId)    => api.get('/dms/thread', { params: { threadId, userId } });
export const sendDM        = (data)                => api.post('/dms/send', data);
export const editDMMessage = (msgId, senderId, text) =>
  api.patch(`/dms/messages/${msgId}`, { senderId, text });
export const deleteDMMessage = (msgId, senderId)   =>
  api.delete(`/dms/messages/${msgId}`, { params: { senderId } });
export const getUnreadCount= (userId)              => api.get('/dms/unread', { params: { userId } });

// ── Reports ───────────────────────────────────────────────────────────────────
export const submitReport  = (data)                => api.post('/report', data);

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminHeaders = (email) => ({ headers: { 'x-admin-email': email } });

export const adminGetStats    = (email)           => api.get('/admin/stats',          adminHeaders(email));
export const adminGetReports  = (email)           => api.get('/admin/reports',        adminHeaders(email));
export const adminUpdateReport= (email, id, data) => api.put(`/admin/report/${id}`,   data, adminHeaders(email));
export const adminDeleteReport= (email, id)       => api.delete(`/admin/report/${id}`,adminHeaders(email));
export const adminGetUsers    = (email)           => api.get('/admin/users',          adminHeaders(email));
export const adminUpdateUser  = (email, id, data) => api.put(`/admin/user/${id}`,     data, adminHeaders(email));
export const adminDeleteUser  = (email, id)       => api.delete(`/admin/user/${id}`,  adminHeaders(email));
export const adminGetStories  = (email)           => api.get('/admin/stories',        adminHeaders(email));
export const adminDeleteStory = (email, id)       => api.delete(`/admin/story/${id}`, adminHeaders(email));
export const adminMarkStorySafe=(email, id)       => api.put(`/admin/story/${id}`,    {}, adminHeaders(email));

export default api;
