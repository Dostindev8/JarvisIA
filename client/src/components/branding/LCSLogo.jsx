export default function LCSLogo({ size = 40, className = '' }) {
  return (
    <img
      src="/lcs-logo.png"
      alt="Logic Code Spot Software Solutions"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
