import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000' });

export const getStories = (params) => api.get('/stories', { params });
export const getStory = (id, requesterId) => api.get(`/stories/${id}`, { params: { requesterId } });
export const createStory = (data) => api.post('/stories', data);
export const getAuthorStories = (authorId) => api.get(`/stories/author/${authorId}`);

export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const followUser = (id, targetId) => api.post(`/users/${id}/follow/${targetId}`);
export const toggleFollow = (followerId, targetId) => api.post('/users/follow', { followerId, targetId });
export const toggleUserLike = (likerId, targetId) => api.post('/users/like', { likerId, targetId });
export const reviewUser = (id, data) => api.post(`/users/${id}/review`, data);
export const toggleStoryLike = (userId, storyId) => api.post('/stories/like', { userId, storyId });

export const getDeals = (userId) => api.get('/deals', { params: { userId } });
export const createDeal = (data) => api.post('/deals/create', data);
export const confirmDeal = (data) => api.post('/deals/confirm', data);
export const cancelDeal = (data) => api.post('/deals/cancel', data);

export const getChat = (storyId) => api.get(`/chat/${storyId}`);
export const sendMessage = (data) => api.post('/chat/send', data);

export default api;
