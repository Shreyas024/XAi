import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { NewScanDrawer } from './NewScanDrawer';

const ROUTE_NAMES = {
  '/': 'Dashboard',
  '/scans': 'Scan History',
  '/health': 'System Health',
};

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const getRouteName = () => {
    if (location.pathname.match(/^\/scans\/[^/]+\/findings\//)) return 'Finding Detail';
    if (location.pathname.match(/^\/scans\/[^/]+$/)) return 'Scan Detail';
    return ROUTE_NAMES[location.pathname] || 'XAI-SecOps';
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      {/* Main content area with dynamic margin for sidebar */}
      <div className="ml-[220px] min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-border/70 bg-surface/70 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="text-sm font-semibold tracking-wide text-text-primary">{getRouteName()}</h1>
          <button
            onClick={() => setDrawerOpen(true)}
            className="bg-accent-blue hover:bg-accent-blue/85 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-all shadow-[0_8px_20px_rgba(31,111,235,0.28)] hover:shadow-[0_12px_24px_rgba(31,111,235,0.35)]"
          >
            New Scan
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <NewScanDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
