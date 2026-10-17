import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from '@/dashboard/Dashboard.jsx';
import '../styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);