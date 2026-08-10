import CosmosCard from './CosmosCard';

export default function CosmosKPIWidget({ title, value, unit, trend, icon: Icon, color = 'gold' }) {
  const border = {
    gold: 'border-jarvis-gold/20',
    emerald: 'border-jarvis-emerald/20',
    red: 'border-jarvis-red/20',
    amber: 'border-jarvis-amber/20',
    cyan: 'border-jarvis-cyan/20'
  }[color];

  return (
    <CosmosCard className={`p-5 relative overflow-hidden ${border}`}>
      {Icon && (
        <Icon className="absolute -right-2 -bottom-2 w-20 h-20 opacity-10" />
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-widest text-jarvis-gold/70">{title}</span>
        {Icon && <Icon size={16} className="text-jarvis-gold/60" />}
      </div>
      <p className="font-jarvis text-3xl text-white">
        {value}
        {unit && <span className="text-base text-white/50 ml-1">{unit}</span>}
      </p>
      {trend && (
        <span className={`text-xs mt-2 inline-block ${trend.direction === 'up' ? 'text-jarvis-emerald' : trend.direction === 'down' ? 'text-jarvis-red' : 'text-white/50'}`}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}%
        </span>
      )}
    </CosmosCard>
  );
}
