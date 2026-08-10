const colors = {
  red: 'border-jarvis-red/30 text-jarvis-red bg-jarvis-red/10',
  gold: 'border-jarvis-gold/30 text-jarvis-gold bg-jarvis-gold/10',
  cyan: 'border-jarvis-cyan/30 text-jarvis-cyan bg-jarvis-cyan/10',
  emerald: 'border-jarvis-emerald/30 text-jarvis-emerald bg-jarvis-emerald/10',
  amber: 'border-jarvis-amber/30 text-jarvis-amber bg-jarvis-amber/10',
  violet: 'border-jarvis-violet/30 text-jarvis-violet bg-jarvis-violet/10'
};

export default function CosmosBadge({ children, color = 'gold' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse bg-current`} />
      {children}
    </span>
  );
}
