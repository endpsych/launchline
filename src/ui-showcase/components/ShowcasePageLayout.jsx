export default function ShowcasePageLayout({ eyebrow, title, description, children }) {
  return (
    <div
      className="custom-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: 28,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(14,22,38,0.96) 0%, rgba(10,15,26,0.92) 100%)',
          padding: '28px 30px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          {eyebrow}
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.1, marginBottom: 10 }}>{title}</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 860, lineHeight: 1.7 }}>
          {description}
        </p>
      </section>

      {children}
    </div>
  );
}
