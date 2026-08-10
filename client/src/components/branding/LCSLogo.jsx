/**
 * Logo JARVISIA — prioriza el branding oficial; fallback al logo LCS legado.
 */
export default function LCSLogo({ size = 40, className = '', variant = 'jarvisia' }) {
  const src = variant === 'lcs' ? '/lcs-logo.png' : '/jarvisia-logo.png';
  const alt = variant === 'lcs' ? 'Logic Code Spot' : 'JARVISIA';

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
      onError={(e) => {
        if (e.currentTarget.src.includes('jarvisia-logo')) {
          e.currentTarget.src = '/lcs-logo.png';
        }
      }}
    />
  );
}
