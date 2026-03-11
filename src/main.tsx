import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';
import { AppProvider } from '@/contexts/AppContext';
import AutoNav from '@/routes/AutoNav';
import Controller from '@/routes/Controller';
import Index from '@/routes/Index';
import PIDTuning from '@/routes/PIDTuning';

import '@/index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/controller" element={<Controller />} />
            <Route path="/pid-tuning" element={<PIDTuning />} />
            <Route path="/auto-nav" element={<AutoNav />} />
          </Routes>
        </HashRouter>
      </AppProvider>
    </StrictMode>,
  );
}
