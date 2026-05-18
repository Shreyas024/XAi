import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getHealth } from '../api/health';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/scans', label: 'Scans', icon: '⊘' },
  { to: '/cli', label: 'CLI Tool', icon: '⌘' },
  { to: '/health', label: 'Health', icon: '♥' },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [healthy, setHealthy] = useState(null);

  useEffect(() => {
    const check = () => {
      getHealth()
        .then(res => setHealthy(res.data?.status === 'healthy'))
        .catch(() => setHealthy(false));
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 bottom-0 bg-surface/90 backdrop-blur-xl border-r border-border z-30 flex flex-col shadow-[12px_0_28px_rgba(1,4,9,0.22)]"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-14 border-b border-border cursor-pointer select-none bg-gradient-to-r from-surface to-surface2/40"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative flex-shrink-0">
          <span className="text-accent-green text-lg">⛨</span>
          {healthy && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green pulse-green" />
          )}
          {healthy === false && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-red" />
          )}
        </div>
        {expanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-semibold text-sm text-text-primary whitespace-nowrap"
          >
            XAI-SecOps
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-md text-sm transition-all ${
                isActive
                  ? 'bg-accent-blue/12 text-text-primary border border-accent-blue/25 shadow-[0_10px_20px_rgba(31,111,235,0.12)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface2/50 border border-transparent'
              }`
            }
          >
            <span className="flex-shrink-0 w-5 text-center">{item.icon}</span>
            {expanded && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      {expanded && (
        <div className="px-4 py-3 border-t border-border text-xs text-text-muted/50">
          v0.1.0
        </div>
      )}
    </motion.aside>
  );
}
