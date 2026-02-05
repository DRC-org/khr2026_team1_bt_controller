import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';
import Controller from '@/routes/Controller';
import Index from '@/routes/Index';
import PIDTuning from '@/routes/PIDTuning';

import '@/index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/controller" element={<Controller />} />
          <Route path="/pid-tuning" element={<PIDTuning />} />
        </Routes>
      </HashRouter>
    </StrictMode>,
  );
}
