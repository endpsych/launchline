import { Box, Layers, Rocket, Activity } from 'lucide-react';

const CARDS = [
  { icon: Box,      title: 'Model Builder',  desc: 'Design and train data models with visual tools and code.' },
  { icon: Layers,   title: 'Model Registry', desc: 'Version, tag and organise all your trained models.' },
  { icon: Rocket,   title: 'Deployment',     desc: 'Deploy models to production with one click.' },
  { icon: Activity, title: 'Monitoring',     desc: 'Track drift, latency and accuracy in real time.' },
];

export default function Models() {
  return (
    <div style={{ padding: 0 }}>
      {/* hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(14,165,233,.08) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '36px 32px', marginBottom: 28,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
          Models
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 520 }}>
          Build, deploy and monitor machine-learning models — from feature engineering to production observability.
        </p>
        <span style={{
          display: 'inline-block', marginTop: 16,
          fontSize: 11, fontWeight: 600, letterSpacing: .5,
          color: 'var(--primary, #6366f1)',
          background: 'rgba(99,102,241,.10)', padding: '4px 10px',
          borderRadius: 'var(--radius-md, 8px)',
        }}>
          Coming soon
        </span>
      </div>

      {/* cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        gap: 16,
      }}>
        {CARDS.map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '24px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
            opacity: .65,
          }}>
            <Icon size={22} style={{ color: 'var(--primary, #6366f1)' }}/>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
