const styles = {
  primary: 'bg-gradient-to-r from-jarvis-red to-jarvis-plasma text-white hover:shadow-glow-red',
  secondary: 'border border-jarvis-gold/30 bg-jarvis-surface/50 hover:border-jarvis-gold/60 hover:shadow-glow-gold',
  ghost: 'border border-white/10 bg-transparent hover:bg-white/5',
  danger: 'bg-jarvis-red/20 border border-jarvis-red/40 hover:bg-jarvis-red/30',
  gold: 'bg-gold-shine text-jarvis-void font-semibold hover:shadow-glow-gold'
};

const sizes = { sm: 'px-3 py-2 text-sm min-h-[44px]', md: 'px-4 py-2.5 text-sm min-h-[44px]', lg: 'px-6 py-3 text-base min-h-[48px]' };

export default function CosmosButton({ children, variant = 'primary', size = 'md', loading, icon, className = '', ...props }) {
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
