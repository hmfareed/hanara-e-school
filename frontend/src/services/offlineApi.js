/**
 * offlineApi.js — Alias for api.js (which has built-in offline capabilities)
 */
import api from './api';

export const offlineGet = api.get;
export const offlinePost = api.post;
export const offlinePut = api.put;
export const offlinePatch = api.patch;
export const offlineDelete = api.delete;

export default api;
