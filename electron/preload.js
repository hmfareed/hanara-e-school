const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
