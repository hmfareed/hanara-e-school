import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import AppRouter from './app/AppRouter';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

if (typeof window !== 'undefined') {
  window.__REACT_QUERY_CLIENT__ = queryClient;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </OfflineProvider>
    </QueryClientProvider>
  );
}

export default App;
