import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LCSLogo from '../components/branding/LCSLogo';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/jarvis', label: 'JARVISIA' }
];

export default function CosmosNavbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 inset-x-0 z-[30] border-b border-jarvis-border/50 bg-jarvis-void/80 backdrop-blur-cosmos">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between safe-area-top">
        <Link to="/jarvis" className="flex items-center gap-3">
          <LCSLogo size={32} />
          <div>
            <span className="font-jarvis text-gold-gradient text-lg tracking-wider">JARVISIA</span>
            <p className="text-[10px] text-white/40 -mt-0.5">Inteligencia que trabaja para ti</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px] flex items-center ${pathname === l.to ? 'text-jarvis-gold bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-2 h-2 rounded-full bg-jarvis-emerald animate-pulse" />
            Online
          </span>
          <span className="text-sm text-white/70">{user?.name}</span>
          <button type="button" onClick={handleLogout} className="icon-btn" aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>

        <button type="button" className="md:hidden icon-btn" onClick={() => setOpen(!open)} aria-label="Menú">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-md border-t border-jarvis-border/50 p-4 space-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg text-sm min-h-[44px]">
              {l.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-jarvis-red min-h-[44px]">
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
