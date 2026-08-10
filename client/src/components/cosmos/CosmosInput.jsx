import { AlertCircle } from 'lucide-react';

export default function CosmosInput({ label, placeholder, value, onChange, type = 'text', error, icon, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs uppercase tracking-widest text-jarvis-gold/70 mb-2">{label}</label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-gold/70">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-lg bg-jarvis-navy/50 border px-4 py-3 text-sm min-h-[44px] transition-all placeholder:text-white/40 focus:outline-none focus:border-jarvis-gold/50 focus:ring-2 focus:ring-jarvis-gold/15 ${icon ? 'pl-10' : ''} ${error ? 'border-jarvis-red' : 'border-white/10'}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-jarvis-red flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
