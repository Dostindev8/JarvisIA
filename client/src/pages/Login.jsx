import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LCSLogo from '../components/branding/LCSLogo';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/jarvis" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface w-full max-w-md rounded-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <LCSLogo size={72} className="mb-4" />
          <p className="text-xs text-jarvis-gold font-medium tracking-widest uppercase mb-1">Logic Code Spot</p>
          <h1 className="font-jarvis text-2xl text-gold-gradient text-center tracking-wider">JARVISIA</h1>
          <p className="text-sm text-muted mt-2 text-center">Inteligencia artificial que trabaja para ti</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input type="text" placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          )}
          <input type="email" placeholder="Correo electrónico" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          <input type="password" placeholder="Contraseña" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" />

          {error && <p className="text-lcs-blue text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-lcs-neon text-lcs-navy-dark font-semibold text-sm min-h-[44px] disabled:opacity-50 shadow-neon hover:brightness-110 transition-all">
            {loading ? 'Entrando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-4 text-sm text-muted hover:text-lcs-neon min-h-[44px] transition-colors">
          {mode === 'login' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
        </button>

        <p className="text-center text-[11px] text-zinc-500 mt-4">+1 (849) 473-7963 · Santo Domingo, RD</p>
      </div>
    </div>
  );
}
