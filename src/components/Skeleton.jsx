/**
 * Skeleton — animated placeholder for loading states.
 *
 * Props:
 *   height  — number (px), default 20
 *   width   — string or number, default '100%'
 *   radius  — number (px), default 6
 *   count   — number of stacked skeletons to render, default 1
 *   gap     — gap between stacked skeletons (px), default 8
 */
export default function Skeleton({ height = 20, width = '100%', radius = 6, count = 1, gap = 8 }) {
  const single = (
    <div style={{
      height,
      width,
      background: 'var(--bg-secondary)',
      borderRadius: radius,
      animation: 'pulse 2s infinite',
    }}/>
  );

  if (count === 1) return single;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height,
          width,
          background: 'var(--bg-secondary)',
          borderRadius: radius,
          animation: 'pulse 2s infinite',
        }}/>
      ))}
    </div>
  );
}
