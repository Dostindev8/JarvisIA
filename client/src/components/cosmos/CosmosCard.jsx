const variants = {
  default: 'border-white/10 shadow-panel',
  gold: 'border-jarvis-gold/20 shadow-panel-gold',
  red: 'border-jarvis-red/20 shadow-panel-red',
  cyan: 'border-jarvis-cyan/15 shadow-panel'
};

export default function CosmosCard({ children, variant = 'default', glow = false, className = '' }) {
  return (
    <div
      className={`glass-md rounded-xl border transition-all duration-240 hover:-translate-y-0.5 ${variants[variant]} ${glow ? 'shadow-glow-gold' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
