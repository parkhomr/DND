export function Portrait({
  index = 0,
  className = '',
  label,
}: {
  index?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`portrait portrait-${index} ${className}`}
      role="img"
      aria-label={label ?? 'Портрет персонажа'}
      style={{ backgroundPosition: `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%` }}
    />
  );
}
