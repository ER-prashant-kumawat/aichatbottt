import { useState } from 'react'

interface CreativeHubProps {
  onNavigate: (page: string) => void
  userId: string
}

const studios = [
  {
    id: 'image-studio',
    title: 'AI Image Studio',
    subtitle: 'Text to Image, Edit, Background Remove',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #f97316, #ec4899)',
    bgGlow: 'rgba(249,115,22,0.15)',
    features: ['Stable Diffusion XL', 'Background Remove', 'Multiple Models', 'Download HD'],
  },
  {
    id: '3d-studio',
    title: '3D Studio',
    subtitle: 'View, Create & Generate 3D Models',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <defs><linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    bgGlow: 'rgba(6,182,212,0.15)',
    features: ['AI 3D Scene Gen', 'Upload .GLB/.OBJ', '3D Viewer', 'Rotate & Zoom'],
  },
  {
    id: 'video-studio',
    title: 'AI Video Studio',
    subtitle: 'Generate Videos from Text',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <defs><linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #10b981, #3b82f6)',
    bgGlow: 'rgba(16,185,129,0.15)',
    features: ['Text to Video', 'AI Animation', 'Download MP4', 'Free Models'],
  },
  {
    id: 'map-studio',
    title: 'Map Studio',
    subtitle: 'Interactive 2D/3D Maps',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <defs><linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" /></linearGradient></defs>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    bgGlow: 'rgba(245,158,11,0.15)',
    features: ['Interactive Map', 'Add Markers', 'Multiple Styles', 'Search Places'],
  },
  {
    id: 'gallery',
    title: 'My Gallery',
    subtitle: 'All Your AI Creations',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <defs><linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <path d="M2 12h20" />
        <path d="M12 2v20" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    bgGlow: 'rgba(168,85,247,0.15)',
    features: ['Images', 'Videos', '3D Models', 'Download All'],
  },
]

export default function CreativeHub({ onNavigate }: CreativeHubProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '600px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 12px 0',
          background: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 4s ease infinite',
        }}>
          Creative AI Studio
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '16px',
          margin: 0,
          lineHeight: 1.6,
        }}>
          Image generate karo, 3D models banao, videos create karo, maps explore karo — sab FREE AI se powered
        </p>
      </div>

      {/* Studio Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        width: '100%',
        maxWidth: '1100px',
      }}>
        {studios.map((studio) => (
          <div
            key={studio.id}
            onClick={() => onNavigate(studio.id)}
            onMouseEnter={() => setHoveredCard(studio.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: hoveredCard === studio.id
                ? `linear-gradient(135deg, rgba(255,255,255,0.08), ${studio.bgGlow})`
                : 'rgba(255,255,255,0.03)',
              border: hoveredCard === studio.id
                ? '1px solid rgba(255,255,255,0.15)'
                : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === studio.id ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hoveredCard === studio.id
                ? `0 20px 40px ${studio.bgGlow}`
                : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: studio.bgGlow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              {studio.icon}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#fff',
              margin: '0 0 6px 0',
            }}>
              {studio.title}
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '14px',
              margin: '0 0 16px 0',
            }}>
              {studio.subtitle}
            </p>

            {/* Feature Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {studio.features.map((f) => (
                <span key={f} style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Arrow */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '16px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: hoveredCard === studio.id ? studio.gradient : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '32px',
        marginTop: '48px',
        padding: '20px 32px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'AI Models', value: '10+', color: '#f97316' },
          { label: 'All Free', value: '100%', color: '#10b981' },
          { label: 'No Limits', value: 'Unlimited', color: '#8b5cf6' },
          { label: 'HD Quality', value: '768px+', color: '#06b6d4' },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
