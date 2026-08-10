import { Link } from 'react-router-dom';
import { Bot, Users, CreditCard, FileText, FolderKanban, Shield, Globe, Share2 } from 'lucide-react';
import CosmosKPIWidget from '../components/cosmos/CosmosKPIWidget';

const modules = [
  { to: '/jarvis', icon: Bot, label: 'JARVIS IA', desc: 'DostinX8 Supreme', accent: 'text-jarvis-gold' },
  { to: '/jarvis', icon: Users, label: 'CRM', desc: 'Clientes y leads', accent: 'text-jarvis-cyan' },
  { to: '/jarvis', icon: CreditCard, label: 'Pagos', desc: 'Cobros y MRR', accent: 'text-jarvis-emerald' },
  { to: '/jarvis', icon: FileText, label: 'Cotizaciones', desc: 'LCS quotes', accent: 'text-jarvis-gold' },
  { to: '/jarvis', icon: Shield, label: 'Seguridad', desc: 'Zero Trust', accent: 'text-jarvis-red' },
  { to: '/jarvis', icon: Globe, label: 'Internet', desc: 'Web search live', accent: 'text-jarvis-cyan' },
  { to: '/jarvis', icon: Share2, label: 'Redes Sociales', desc: 'Copy y estrategia', accent: 'text-jarvis-violet' },
  { to: '/jarvis', icon: FolderKanban, label: 'Proyectos', desc: 'Kanban pipeline', accent: 'text-jarvis-amber' }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="font-jarvis text-2xl text-gold-gradient">Mission Control</h1>
        <p className="text-sm text-muted mt-1">Logic Code Spot · Santo Domingo, RD</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CosmosKPIWidget title="MRR" value="$—" unit="USD" color="gold" icon={CreditCard} trend={{ value: 0, direction: 'neutral' }} />
        <CosmosKPIWidget title="Clientes activos" value="—" color="emerald" icon={Users} />
        <CosmosKPIWidget title="Leads" value="—" color="cyan" icon={Bot} />
        <CosmosKPIWidget title="En riesgo" value="—" color="amber" icon={Shield} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map(({ to, icon: Icon, label, desc, accent }) => (
          <Link key={label} to={to} className="surface p-5 hover:border-jarvis-gold/30 transition-all min-h-[120px] flex flex-col gap-2 group">
            <Icon className={`w-7 h-7 ${accent}`} />
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs text-muted">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
