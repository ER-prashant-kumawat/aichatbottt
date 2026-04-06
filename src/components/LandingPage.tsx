import { useState, useEffect, useRef } from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface LandingPageProps {
  onUserSet: (userId: string) => void
}

const landingStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');

  /* ===== COSMIC ANIMATIONS ===== */
  @keyframes twinkle {
    0%, 100% { opacity: 0.2; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.3); }
  }
  @keyframes twinkleFast {
    0%, 100% { opacity: 0.1; }
    30% { opacity: 1; }
    60% { opacity: 0.3; }
  }
  @keyframes floatVishnu {
    0% { transform: translateY(0px); }
    25% { transform: translateY(-30px); }
    50% { transform: translateY(-15px); }
    75% { transform: translateY(-35px); }
    100% { transform: translateY(0px); }
  }
  @keyframes cosmicPulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.08); }
  }
  @keyframes galaxyRingSpin {
    0% { transform: rotateX(75deg) rotateZ(0deg); }
    100% { transform: rotateX(75deg) rotateZ(360deg); }
  }
  @keyframes galaxyRingSpin2 {
    0% { transform: rotateX(70deg) rotateY(15deg) rotateZ(0deg); }
    100% { transform: rotateX(70deg) rotateY(15deg) rotateZ(-360deg); }
  }
  @keyframes galaxyRingSpin3 {
    0% { transform: rotateX(80deg) rotateY(-10deg) rotateZ(0deg); }
    100% { transform: rotateX(80deg) rotateY(-10deg) rotateZ(360deg); }
  }
  @keyframes chakraSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes chakraSpinReverse {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes omGlow {
    0%, 100% {
      text-shadow: 0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,165,0,0.3), 0 0 80px rgba(138,43,226,0.2);
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      text-shadow: 0 0 40px rgba(255,215,0,0.9), 0 0 80px rgba(255,165,0,0.5), 0 0 120px rgba(138,43,226,0.3);
      transform: translate(-50%, -50%) scale(1.08);
    }
  }
  @keyframes omSpin3D {
    0% { transform: translate(-50%, -50%) rotateY(0deg); }
    100% { transform: translate(-50%, -50%) rotateY(360deg); }
  }
  @keyframes planetOrbit {
    0% { transform: rotate(var(--start-angle, 0deg)) translateX(var(--orbit-r)) rotate(calc(-1 * var(--start-angle, 0deg))); }
    100% { transform: rotate(calc(var(--start-angle, 0deg) + 360deg)) translateX(var(--orbit-r)) rotate(calc(-1 * (var(--start-angle, 0deg) + 360deg))); }
  }
  @keyframes planetSelfSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes ringPulse {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.35; }
  }
  @keyframes saturnRingSpin {
    0% { transform: rotateX(75deg) rotateZ(0deg); }
    100% { transform: rotateX(75deg) rotateZ(360deg); }
  }
  .planet-label {
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .planet-wrapper:hover .planet-label {
    opacity: 1 !important;
  }
  .planet-wrapper:hover .planet-body {
    filter: brightness(1.3) !important;
    transform: scale(1.2) !important;
  }
  @keyframes shootingStar {
    0% { transform: translateX(0) translateY(0) rotate(-45deg); opacity: 0; width: 0; }
    5% { opacity: 1; }
    50% { opacity: 1; width: 120px; }
    100% { transform: translateX(500px) translateY(500px) rotate(-45deg); opacity: 0; width: 0; }
  }
  @keyframes nebulaDrift {
    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.5; }
    25% { transform: translate(40px, -30px) scale(1.15) rotate(5deg); opacity: 0.7; }
    50% { transform: translate(-20px, 20px) scale(0.9) rotate(-3deg); opacity: 0.4; }
    75% { transform: translate(30px, 10px) scale(1.1) rotate(2deg); opacity: 0.6; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(60px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes glowLine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes floatParticle {
    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
    25% { transform: translateY(-50px) translateX(25px); opacity: 1; }
    50% { transform: translateY(-25px) translateX(-15px); opacity: 0.3; }
    75% { transform: translateY(-70px) translateX(20px); opacity: 0.7; }
  }
  @keyframes cosmicRayPulse {
    0%, 100% { opacity: 0; transform: scaleY(0); }
    20% { opacity: 0.6; transform: scaleY(1); }
    80% { opacity: 0.3; transform: scaleY(1); }
  }
  @keyframes orbitalFloat {
    0% { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
  }
  @keyframes warpSpeed {
    0% { transform: translateZ(0) scale(1); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateZ(200px) scale(2); opacity: 0; }
  }
  @keyframes reflectionShimmer {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.35; }
  }
  @keyframes cosmicWave {
    0%, 100% { transform: translateX(-50%) scaleY(1); }
    50% { transform: translateX(-50%) scaleY(1.1); }
  }
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(80px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes divineAuraBreath {
    0%, 100% {
      box-shadow: 0 0 80px rgba(138,43,226,0.2), 0 0 160px rgba(75,0,130,0.1), 0 0 240px rgba(255,215,0,0.05);
    }
    50% {
      box-shadow: 0 0 120px rgba(138,43,226,0.4), 0 0 240px rgba(75,0,130,0.2), 0 0 360px rgba(255,215,0,0.1);
    }
  }
  @keyframes energyFlow {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes portalSpin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes floatBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  @keyframes starBurst {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(3); opacity: 0; }
  }

  /* ===== SCROLLBAR ===== */
  .landing-container { scroll-behavior: smooth; }
  .landing-container::-webkit-scrollbar { width: 4px; }
  .landing-container::-webkit-scrollbar-track { background: transparent; }
  .landing-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(138,43,226,0.4), rgba(255,215,0,0.3));
    border-radius: 4px;
  }

  /* ===== INTERACTIVE ===== */
  .feature-card {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  .feature-card:hover {
    transform: translateY(-12px) scale(1.02) !important;
    border-color: rgba(138,43,226,0.5) !important;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(138,43,226,0.15), inset 0 1px 0 rgba(255,255,255,0.1) !important;
    background: rgba(138,43,226,0.08) !important;
  }
  .nav-link:hover { color: rgba(200,170,255,1) !important; }
  .cta-btn:hover {
    transform: translateY(-3px) scale(1.02) !important;
    box-shadow: 0 12px 40px rgba(138,43,226,0.5), 0 0 60px rgba(138,43,226,0.2) !important;
  }
  .outline-btn:hover {
    background: rgba(138,43,226,0.15) !important;
    border-color: rgba(138,43,226,0.6) !important;
    box-shadow: 0 0 30px rgba(138,43,226,0.15) !important;
  }
  .cosmic-section {
    perspective: 1000px;
  }
`

// ===== DEEP SPACE STAR FIELD =====
function DeepStarField({ count = 300, className = '' }: { count?: number; className?: string }) {
  const starsRef = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 0.3,
      delay: Math.random() * 8,
      duration: Math.random() * 4 + 1.5,
      opacity: Math.random() * 0.8 + 0.2,
      color: ['#fff', '#E8D5FF', '#B8C6FF', '#FFE4B5', '#C5CFFF', '#FFDAB9'][Math.floor(Math.random() * 6)],
    }))
  )
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {starsRef.current.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          borderRadius: '50%',
          backgroundColor: s.color,
          animation: `${s.size > 2 ? 'twinkle' : 'twinkleFast'} ${s.duration}s ease-in-out ${s.delay}s infinite`,
          opacity: s.opacity,
          boxShadow: s.size > 1.5 ? `0 0 ${s.size * 3}px ${s.color}` : 'none',
        }} />
      ))}
    </div>
  )
}

// ===== 3D SOLAR SYSTEM with OM at center =====
const planets = [
  { name: 'बुध', nameEn: 'Mercury', radius: 70, size: 8, speed: 6, color: '#B0B0B0', glow: 'rgba(176,176,176,0.4)', startAngle: 0 },
  { name: 'शुक्र', nameEn: 'Venus', radius: 100, size: 11, speed: 9, color: '#E8C56D', glow: 'rgba(232,197,109,0.4)', startAngle: 45 },
  { name: 'पृथ्वी', nameEn: 'Earth', radius: 135, size: 12, speed: 12, color: '#4A90D9', glow: 'rgba(74,144,217,0.5)', startAngle: 120, hasRing: false, special: true },
  { name: 'मंगल', nameEn: 'Mars', radius: 170, size: 10, speed: 16, color: '#D4553A', glow: 'rgba(212,85,58,0.4)', startAngle: 200 },
  { name: 'बृहस्पति', nameEn: 'Jupiter', radius: 215, size: 22, speed: 22, color: '#C4956A', glow: 'rgba(196,149,106,0.4)', startAngle: 80, bands: true },
  { name: 'शनि', nameEn: 'Saturn', radius: 265, size: 18, speed: 30, color: '#E8D5A3', glow: 'rgba(232,213,163,0.4)', startAngle: 300, hasRing: true },
  { name: 'अरुण', nameEn: 'Uranus', radius: 310, size: 15, speed: 40, color: '#7EC8E3', glow: 'rgba(126,200,227,0.4)', startAngle: 160 },
  { name: 'वरुण', nameEn: 'Neptune', radius: 350, size: 14, speed: 50, color: '#3B5CDB', glow: 'rgba(59,92,219,0.5)', startAngle: 260 },
  { name: 'प्लूटो', nameEn: 'Pluto', radius: 385, size: 6, speed: 60, color: '#C2A882', glow: 'rgba(194,168,130,0.3)', startAngle: 30 },
]

function SolarSystem({ scale = 1, tiltX = 18, tiltZ = -5 }: { scale?: number; tiltX?: number; tiltZ?: number }) {
  const s = 800 * scale
  return (
    <div style={{
      position: 'relative',
      width: `${s}px`,
      height: `${s}px`,
      perspective: '1200px',
    }}>
      {/* 3D tilt wrapper */}
      <div style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        transform: `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {/* Central OM - 3D rotating */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          zIndex: 20,
          transformStyle: 'preserve-3d',
          animation: 'omSpin3D 12s linear infinite',
        }}>
          {/* OM glow background */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.25) 0%, rgba(255,165,0,0.1) 40%, rgba(138,43,226,0.05) 60%, transparent 80%)',
            animation: 'cosmicPulse 3s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140px', height: '140px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(138,43,226,0.1) 0%, transparent 70%)',
            animation: 'cosmicPulse 5s ease-in-out 1s infinite',
          }} />
          {/* OM symbol */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            fontSize: '52px',
            fontWeight: 700,
            color: '#FFD700',
            animation: 'omGlow 4s ease-in-out infinite',
            userSelect: 'none',
            lineHeight: 1,
            fontFamily: 'serif',
          }}>
            ॐ
          </span>
        </div>

        {/* Orbit paths + Planets */}
        {planets.map((planet, i) => (
          <div key={planet.nameEn} style={{ position: 'absolute', inset: 0 }}>
            {/* Orbit ring */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: `${planet.radius * 2}px`,
              height: `${planet.radius * 2}px`,
              marginTop: `${-planet.radius}px`,
              marginLeft: `${-planet.radius}px`,
              borderRadius: '50%',
              border: `1px solid rgba(138,43,226,${0.06 + (i < 4 ? 0.04 : 0.02)})`,
              animation: `ringPulse ${6 + i * 2}s ease-in-out ${i * 0.5}s infinite`,
              pointerEvents: 'none',
            }} />

            {/* Planet orbiting */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: `${planet.size}px`,
              height: `${planet.size}px`,
              marginTop: `${-planet.size / 2}px`,
              marginLeft: `${-planet.size / 2}px`,
              ['--orbit-r' as string]: `${planet.radius}px`,
              ['--start-angle' as string]: `${planet.startAngle}deg`,
              animation: `planetOrbit ${planet.speed}s linear infinite`,
              zIndex: 10,
            }}>
              <div className="planet-wrapper" style={{
                position: 'relative',
                width: `${planet.size}px`,
                height: `${planet.size}px`,
                cursor: 'pointer',
              }}>
                {/* Planet body */}
                <div className="planet-body" style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: planet.bands
                    ? `linear-gradient(180deg, ${planet.color} 0%, #A07850 30%, ${planet.color} 50%, #8B6E4E 70%, ${planet.color} 100%)`
                    : planet.special
                    ? `radial-gradient(circle at 35% 35%, #6DB3F2, ${planet.color}, #2E6BA8)`
                    : `radial-gradient(circle at 35% 35%, ${planet.color}, ${planet.color}88)`,
                  boxShadow: `0 0 ${planet.size}px ${planet.glow}, inset -${planet.size / 4}px -${planet.size / 4}px ${planet.size / 2}px rgba(0,0,0,0.4)`,
                  animation: `planetSelfSpin ${3 + i}s linear infinite`,
                  transition: 'filter 0.3s, transform 0.3s',
                  position: 'relative',
                }}>
                  {/* Earth's moon */}
                  {planet.special && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px', right: '-8px',
                      width: '4px', height: '4px', borderRadius: '50%',
                      backgroundColor: '#ccc',
                      boxShadow: '0 0 4px rgba(200,200,200,0.5)',
                    }} />
                  )}
                </div>

                {/* Saturn's ring */}
                {planet.hasRing && (
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: `${planet.size * 2.2}px`,
                    height: `${planet.size * 2.2}px`,
                    marginTop: `${-planet.size * 1.1}px`,
                    marginLeft: `${-planet.size * 1.1}px`,
                    borderRadius: '50%',
                    border: `2px solid rgba(232,213,163,0.35)`,
                    animation: 'saturnRingSpin 4s linear infinite',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      position: 'absolute', inset: '3px', borderRadius: '50%',
                      border: '1px solid rgba(232,213,163,0.2)',
                    }} />
                  </div>
                )}

                {/* Planet label (Hindi + English) */}
                <div className="planet-label" style={{
                  position: 'absolute',
                  top: `${planet.size + 8}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  color: planet.color,
                  textShadow: `0 0 10px ${planet.glow}`,
                  lineHeight: 1.3,
                }}>
                  <div>{planet.name}</div>
                  <div style={{ fontSize: '9px', opacity: 0.7, fontWeight: 400 }}>{planet.nameEn}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== SHOOTING STAR =====
function ShootingStar({ delay, top, left }: { delay: number; top: string; left: string }) {
  return (
    <div style={{
      position: 'absolute', top, left,
      height: '2px',
      background: 'linear-gradient(90deg, rgba(200,180,255,0.9), rgba(138,43,226,0.5), transparent)',
      borderRadius: '2px',
      animation: `shootingStar 3s ease-in ${delay}s infinite`,
      boxShadow: '0 0 6px rgba(138,43,226,0.5)',
      pointerEvents: 'none',
    }} />
  )
}

// ===== COSMIC OCEAN (reflection surface) =====
function CosmicOcean() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '25%',
      background: 'linear-gradient(to bottom, transparent, rgba(75,0,130,0.04), rgba(100,100,255,0.06))',
      pointerEvents: 'none',
    }}>
      {/* Ripple lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: `${i * 15 + 10}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${60 + i * 15}%`,
          height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(138,43,226,${0.1 - i * 0.015}), transparent)`,
          animation: `cosmicWave ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ===== NEBULA CLOUD =====
function NebulaCloud({ top, left, size, color, delay }: {
  top: string; left: string; size: number; color: string; delay: number;
}) {
  return (
    <div style={{
      position: 'absolute', top, left,
      width: `${size}px`, height: `${size}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      animation: `nebulaDrift ${12 + delay}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
      filter: 'blur(2px)',
    }} />
  )
}

export default function LandingPage({ onUserSet }: LandingPageProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(['hero']))
  const containerRef = useRef<HTMLDivElement>(null)
  const convex = useConvex()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleScroll = () => {
      setScrolled(container.scrollTop > 50)
      const sections = ['hero', 'features', 'about', 'signin']
      const newVisible = new Set<string>()
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight * 0.8 && rect.bottom > 0) {
            newVisible.add(id)
          }
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            setActiveSection(id)
          }
        }
      }
      setVisibleSections(newVisible)
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (authMode === 'login') {
      if (!email || !password) { setError('Please fill in all fields'); return }
      setLoading(true)
      try {
        const user = await convex.mutation(api.users.login, { email, password })
        localStorage.setItem('userId', user._id)
        onUserSet(user._id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('INVALID_CREDENTIALS')) setError('Invalid email or password')
        else setError(msg || 'Login failed')
      } finally {
        setLoading(false)
      }
    } else {
      if (!email || !name || !password || !confirmPassword) { setError('Please fill in all fields'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
      setLoading(true)
      try {
        const user = await convex.mutation(api.users.signup, { email, name, password })
        localStorage.setItem('userId', user._id)
        onUserSet(user._id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('ALREADY_REGISTERED')) setError('This email is already registered. Please login instead.')
        else setError(msg || 'Signup failed')
      } finally {
        setLoading(false)
      }
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: '🧠',
      title: 'AI-Powered Intelligence',
      desc: 'Advanced neural AI that understands context, nuance, and complexity. Get responses that truly comprehend your needs.',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))',
    },
    {
      icon: '⚡',
      title: 'Real-Time Streaming',
      desc: 'Watch AI think and respond in real-time with live streaming. Instant, fluid conversation without any delays.',
      gradient: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(139,92,246,0.08))',
    },
    {
      icon: '🌐',
      title: 'Multi-Thread Universe',
      desc: 'Create infinite conversation threads. Each thread is its own universe of knowledge and context.',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
    },
    {
      icon: '🔮',
      title: 'Cosmic Memory',
      desc: 'The AI remembers everything within your threads. Build on previous conversations for deeper insights.',
      gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.08))',
    },
    {
      icon: '🛡️',
      title: 'Divine Security',
      desc: 'Enterprise-grade encryption protects every conversation. Your data is sacred and untouchable.',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))',
    },
    {
      icon: '💻',
      title: 'Code & Create',
      desc: 'Write code, craft stories, analyze data, solve problems. An omniscient companion for every domain.',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(236,72,153,0.08))',
    },
  ]

  return (
    <div ref={containerRef} className="landing-container" style={{
      height: '100vh', overflowY: 'auto', overflowX: 'hidden',
      backgroundColor: '#030014', position: 'relative',
    }}>
      <style>{landingStyles}</style>

      {/* ============================== */}
      {/* ========= NAVBAR ============= */}
      {/* ============================== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '0 48px', height: '72px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: scrolled ? 'rgba(3,0,20,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(138,43,226,0.15)' : 'none',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
          onClick={() => scrollTo('hero')}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(138,43,226,0.4)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              background: 'linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent)',
            }} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
              <circle cx="12" cy="12" r="11" strokeDasharray="2 4" opacity="0.5" />
            </svg>
          </div>
          <span style={{
            fontSize: '22px', fontWeight: 800, fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '2px',
            background: 'linear-gradient(90deg, #A78BFA, #818CF8, #C084FC)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            DIVYA AI
          </span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          {[
            { label: 'Home', id: 'hero' },
            { label: 'Features', id: 'features' },
            { label: 'About', id: 'about' },
            { label: 'Sign In', id: 'signin' },
          ].map(link => (
            <button key={link.id} className="nav-link" onClick={() => scrollTo(link.id)} style={{
              background: 'none', border: 'none',
              color: activeSection === link.id ? '#A78BFA' : 'rgba(255,255,255,0.55)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px',
              transition: 'color 0.3s', padding: '8px 0',
              borderBottom: activeSection === link.id ? '2px solid #8B5CF6' : '2px solid transparent',
            }}>
              {link.label}
            </button>
          ))}
          <button className="cta-btn" onClick={() => scrollTo('signin')} style={{
            padding: '10px 28px',
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            border: 'none', borderRadius: '10px', color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', transition: 'all 0.3s',
            boxShadow: '0 4px 24px rgba(138,43,226,0.4)',
          }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ============================== */}
      {/* ======= HERO SECTION ========= */}
      {/* ============================== */}
      <section id="hero" className="cosmic-section" style={{
        height: '100vh', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, #0f0530 0%, #080020 30%, #030014 60%, #010008 100%)',
      }}>
        <DeepStarField count={350} />

        {/* Nebulae */}
        <NebulaCloud top="5%" left="70%" size={500} color="rgba(138,43,226,0.06)" delay={0} />
        <NebulaCloud top="60%" left="-5%" size={400} color="rgba(75,0,130,0.05)" delay={3} />
        <NebulaCloud top="30%" left="40%" size={300} color="rgba(100,100,255,0.04)" delay={6} />
        <NebulaCloud top="70%" left="80%" size={350} color="rgba(236,72,153,0.03)" delay={4} />

        {/* Galaxy ring effect across the whole hero */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '1200px', height: '1200px',
          marginTop: '-600px', marginLeft: '-600px',
          borderRadius: '50%',
          border: '1px solid rgba(138,43,226,0.06)',
          animation: 'galaxyRingSpin 60s linear infinite',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', inset: '-1px', borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(138,43,226,0.04) 25%, transparent 50%, rgba(75,0,130,0.03) 75%, transparent 100%)',
          }} />
        </div>

        {/* Shooting stars */}
        <ShootingStar delay={0} top="12%" left="8%" />
        <ShootingStar delay={4} top="22%" left="65%" />
        <ShootingStar delay={7} top="45%" left="25%" />
        <ShootingStar delay={11} top="8%" left="85%" />
        <ShootingStar delay={15} top="55%" left="50%" />

        {/* Cosmic ocean at bottom */}
        <CosmicOcean />

        {/* Hero Layout: Left = Solar System, Right = Text */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: '1400px', padding: '0 40px',
          gap: '40px', margin: '0 auto',
        }}>

          {/* LEFT - Solar System */}
          <div style={{
            flex: '0 0 auto',
            animation: 'fadeInScale 1.8s ease-out',
          }}>
            <SolarSystem scale={0.72} tiltX={15} tiltZ={-8} />
          </div>

          {/* RIGHT - Text Content */}
          <div style={{
            flex: '1 1 500px', maxWidth: '560px',
            textAlign: 'left',
            animation: 'fadeInUp 1.2s ease-out 0.5s both',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 20px', borderRadius: '24px',
              border: '1px solid rgba(138,43,226,0.3)',
              backgroundColor: 'rgba(138,43,226,0.08)',
              marginBottom: '24px', fontSize: '12px', color: '#A78BFA',
              fontFamily: 'Inter, sans-serif', letterSpacing: '2px', fontWeight: 500,
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#8B5CF6', boxShadow: '0 0 8px #8B5CF6',
                animation: 'cosmicPulse 2s ease-in-out infinite',
              }} />
              COSMIC AI INTELLIGENCE
            </div>

            <h1 style={{
              fontSize: '56px', fontWeight: 900, lineHeight: 1.15,
              margin: '0 0 20px 0', fontFamily: 'Cinzel, serif', color: '#fff',
              textShadow: '0 2px 30px rgba(3,0,20,0.8), 0 0 60px rgba(3,0,20,0.6)',
            }}>
              <span style={{ display: 'block', fontSize: '20px', fontWeight: 400, color: 'rgba(167,139,250,0.7)', letterSpacing: '6px', marginBottom: '10px', fontFamily: 'Rajdhani, sans-serif' }}>
                EXPERIENCE THE
              </span>
              Divine{' '}
              <span style={{
                background: 'linear-gradient(90deg, #8B5CF6, #EC4899, #8B5CF6, #6366F1)',
                backgroundSize: '300% auto',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'glowLine 4s linear infinite',
              }}>
                Intelligence
              </span>
            </h1>

            <p style={{
              fontSize: '17px', lineHeight: 1.8, color: 'rgba(255,255,255,0.5)',
              margin: '0 0 36px 0', fontFamily: 'Inter, sans-serif', fontWeight: 300,
              maxWidth: '500px',
            }}>
              Travel through the cosmos of knowledge with an AI that transcends boundaries.
              Explore infinite wisdom in every conversation.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className="cta-btn" onClick={() => scrollTo('signin')} style={{
                padding: '16px 44px',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1, #7C3AED)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.4s',
                boxShadow: '0 4px 30px rgba(138,43,226,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                letterSpacing: '0.5px',
              }}>
                Begin Journey
              </button>
              <button className="outline-btn" onClick={() => scrollTo('features')} style={{
                padding: '16px 44px',
                background: 'rgba(3,0,20,0.6)',
                border: '1px solid rgba(138,43,226,0.3)',
                borderRadius: '12px', color: '#A78BFA',
                fontSize: '16px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.4s',
                backdropFilter: 'blur(8px)',
              }}>
                Explore Cosmos
              </button>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex', gap: '50px', marginTop: '44px',
              padding: '20px 0', borderTop: '1px solid rgba(138,43,226,0.15)',
            }}>
              {[
                { value: '9', label: 'Planets' },
                { value: '∞', label: 'Knowledge' },
                { value: '24/7', label: 'Available' },
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{
                    fontSize: '26px', fontWeight: 700, color: '#A78BFA',
                    fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1px',
                  }}>{stat.value}</div>
                  <div style={{
                    fontSize: '12px', color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'Inter, sans-serif', letterSpacing: '1px',
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          cursor: 'pointer', opacity: 0.4, animation: 'floatBounce 2.5s ease-in-out infinite',
        }} onClick={() => scrollTo('features')}>
          <span style={{ fontSize: '11px', color: 'rgba(167,139,250,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '3px', fontWeight: 500 }}>
            SCROLL
          </span>
          <div style={{
            width: '20px', height: '32px', borderRadius: '10px',
            border: '1.5px solid rgba(138,43,226,0.4)', position: 'relative',
          }}>
            <div style={{
              width: '3px', height: '8px', borderRadius: '2px',
              backgroundColor: '#8B5CF6', position: 'absolute',
              top: '6px', left: '50%', transform: 'translateX(-50%)',
              animation: 'floatBounce 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* ====== FEATURES SECTION ====== */}
      {/* ============================== */}
      <section id="features" className="cosmic-section" style={{
        minHeight: '100vh', padding: '140px 48px 100px',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #010008 0%, #050020 15%, #080030 50%, #050020 85%, #010008 100%)',
      }}>
        <DeepStarField count={200} />

        {/* Big galaxy ring in background */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '900px', height: '900px', marginTop: '-450px', marginLeft: '-450px',
          borderRadius: '50%', opacity: 0.15, pointerEvents: 'none',
          border: '2px solid rgba(138,43,226,0.2)',
          animation: 'galaxyRingSpin 40s linear infinite',
        }}>
          <div style={{
            position: 'absolute', inset: '-1px', borderRadius: '50%',
            background: 'conic-gradient(from 90deg, transparent, rgba(138,43,226,0.1), transparent, rgba(100,100,255,0.08), transparent)',
          }} />
        </div>

        <NebulaCloud top="20%" left="80%" size={350} color="rgba(138,43,226,0.05)" delay={2} />
        <NebulaCloud top="70%" left="5%" size={300} color="rgba(75,0,130,0.04)" delay={5} />

        {/* Section Header */}
        <div style={{
          textAlign: 'center', marginBottom: '80px',
          position: 'relative', zIndex: 5,
          animation: visibleSections.has('features') ? 'fadeInUp 0.8s ease-out both' : 'none',
          opacity: visibleSections.has('features') ? 1 : 0,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', borderRadius: '24px',
            border: '1px solid rgba(138,43,226,0.2)',
            backgroundColor: 'rgba(138,43,226,0.06)',
            marginBottom: '24px', fontSize: '12px', color: '#A78BFA',
            fontFamily: 'Inter, sans-serif', letterSpacing: '3px', fontWeight: 500,
          }}>
            CAPABILITIES
          </div>
          <h2 style={{
            fontSize: '48px', fontWeight: 800, fontFamily: 'Cinzel, serif',
            color: '#fff', margin: '0 0 18px 0',
          }}>
            Cosmic{' '}
            <span style={{
              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Powers
            </span>
          </h2>
          <p style={{
            fontSize: '17px', color: 'rgba(255,255,255,0.4)', maxWidth: '550px', margin: '0 auto',
            fontFamily: 'Inter, sans-serif', fontWeight: 300, lineHeight: 1.8,
          }}>
            Harness the infinite power of AI across every dimension of thought
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '28px', maxWidth: '1100px', margin: '0 auto',
          position: 'relative', zIndex: 5,
        }}>
          {features.map((feature, i) => (
            <div key={i} className="feature-card" style={{
              padding: '36px 32px', borderRadius: '20px',
              backgroundColor: 'rgba(138,43,226,0.04)',
              border: '1px solid rgba(138,43,226,0.12)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              animation: visibleSections.has('features') ? `fadeInUp 0.7s ease-out ${i * 0.12}s both` : 'none',
              opacity: visibleSections.has('features') ? 1 : 0,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Card glow accent */}
              <div style={{
                position: 'absolute', top: '-50%', right: '-50%',
                width: '200px', height: '200px', borderRadius: '50%',
                background: feature.gradient, filter: 'blur(40px)',
                pointerEvents: 'none',
              }} />

              <div style={{
                fontSize: '36px', marginBottom: '18px',
                filter: 'drop-shadow(0 0 8px rgba(138,43,226,0.3))',
                position: 'relative',
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '19px', fontWeight: 600, color: '#E8D5FF',
                margin: '0 0 12px 0', fontFamily: 'Inter, sans-serif',
                position: 'relative',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px', color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.8, margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 300,
                position: 'relative',
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================== */}
      {/* ======= ABOUT SECTION ======== */}
      {/* ============================== */}
      <section id="about" className="cosmic-section" style={{
        minHeight: '100vh', padding: '140px 48px 100px',
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 30% 40%, #0a0030 0%, #050018 40%, #030014 70%, #010008 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <DeepStarField count={180} />

        <NebulaCloud top="10%" left="60%" size={400} color="rgba(236,72,153,0.04)" delay={1} />
        <NebulaCloud top="60%" left="20%" size={350} color="rgba(138,43,226,0.05)" delay={4} />

        {/* Portal ring */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '700px', height: '700px',
          borderRadius: '50%', pointerEvents: 'none',
          border: '1px solid rgba(138,43,226,0.08)',
          animation: 'portalSpin 50s linear infinite',
        }}>
          <div style={{
            position: 'absolute', inset: '-1px', borderRadius: '50%',
            background: 'conic-gradient(from 180deg, transparent, rgba(236,72,153,0.05), transparent, rgba(138,43,226,0.05), transparent)',
          }} />
        </div>

        <div style={{
          maxWidth: '1100px', width: '100%', position: 'relative', zIndex: 5,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center',
          animation: visibleSections.has('about') ? 'fadeInUp 1s ease-out both' : 'none',
          opacity: visibleSections.has('about') ? 1 : 0,
        }}>
          {/* Left - Cosmic visual */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Concentric rings */}
            <div style={{ position: 'relative', width: '350px', height: '350px' }}>
              {[350, 280, 210, 140].map((size, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: `${size}px`, height: `${size}px`,
                  marginTop: `${-size / 2}px`, marginLeft: `${-size / 2}px`,
                  borderRadius: '50%',
                  border: `1px solid rgba(138,43,226,${0.12 + i * 0.06})`,
                  animation: `${i % 2 === 0 ? 'chakraSpin' : 'chakraSpinReverse'} ${20 - i * 3}s linear infinite`,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-3px', left: '50%', marginLeft: '-3px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: ['#8B5CF6', '#EC4899', '#6366F1', '#A78BFA'][i],
                    boxShadow: `0 0 10px ${['#8B5CF6', '#EC4899', '#6366F1', '#A78BFA'][i]}`,
                  }} />
                </div>
              ))}
              {/* Center */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                boxShadow: '0 0 40px rgba(138,43,226,0.4), 0 0 80px rgba(138,43,226,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '24px' }}>🕉️</span>
              </div>
            </div>
          </div>

          {/* Right - Text */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 20px', borderRadius: '24px',
              border: '1px solid rgba(138,43,226,0.2)',
              backgroundColor: 'rgba(138,43,226,0.06)',
              marginBottom: '24px', fontSize: '12px', color: '#A78BFA',
              fontFamily: 'Inter, sans-serif', letterSpacing: '3px', fontWeight: 500,
            }}>
              ABOUT THE PROJECT
            </div>
            <h2 style={{
              fontSize: '42px', fontWeight: 800, fontFamily: 'Cinzel, serif',
              color: '#fff', margin: '0 0 24px 0', lineHeight: 1.2,
            }}>
              Built With{' '}
              <span style={{
                background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Cosmic Vision
              </span>
            </h2>
            <p style={{
              fontSize: '16px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.9,
              margin: '0 0 32px 0', fontFamily: 'Inter, sans-serif', fontWeight: 300,
            }}>
              Divya AI is built on the principle of cosmic intelligence — an AI that
              maintains balance between power and precision. Like a force traversing the cosmos with
              divine purpose, it navigates the infinite space of knowledge to bring you
              precise, meaningful, and enlightened responses.
            </p>

            {/* Tech stack badges */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['React', 'Convex', 'AI/ML', 'Real-time', 'TypeScript'].map(tech => (
                <span key={tech} style={{
                  padding: '6px 16px', borderRadius: '8px',
                  backgroundColor: 'rgba(138,43,226,0.08)',
                  border: '1px solid rgba(138,43,226,0.15)',
                  color: 'rgba(167,139,250,0.8)', fontSize: '13px',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* ====== SIGN IN SECTION ======= */}
      {/* ============================== */}
      <section id="signin" className="cosmic-section" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '100px 48px', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, #0a0030 0%, #050018 40%, #030014 100%)',
      }}>
        <DeepStarField count={150} />

        <NebulaCloud top="20%" left="70%" size={400} color="rgba(138,43,226,0.05)" delay={2} />
        <NebulaCloud top="60%" left="10%" size={350} color="rgba(75,0,130,0.04)" delay={5} />

        {/* Portal effect behind form */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '600px', height: '600px',
          borderRadius: '50%', pointerEvents: 'none',
          animation: 'portalSpin 30s linear infinite',
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1px solid rgba(138,43,226,0.1)',
          }} />
          <div style={{
            position: 'absolute', inset: '40px', borderRadius: '50%',
            border: '1px solid rgba(138,43,226,0.08)',
          }} />
          <div style={{
            position: 'absolute', inset: '80px', borderRadius: '50%',
            border: '1px solid rgba(138,43,226,0.06)',
          }} />
        </div>

        <div style={{
          width: '100%', maxWidth: '460px', position: 'relative', zIndex: 10,
          animation: visibleSections.has('signin') ? 'fadeInUp 0.8s ease-out both' : 'none',
          opacity: visibleSections.has('signin') ? 1 : 0,
        }}>
          <form onSubmit={handleSubmit} style={{
            padding: '52px 44px', borderRadius: '24px',
            backgroundColor: 'rgba(138,43,226,0.04)',
            border: '1px solid rgba(138,43,226,0.15)',
            backdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(138,43,226,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Form glow accent */}
            <div style={{
              position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
              width: '300px', height: '200px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(138,43,226,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 40px rgba(138,43,226,0.4)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '18px',
                  background: 'linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent)',
                }} />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '30px', fontWeight: 800, color: '#fff',
                margin: '0 0 10px 0', fontFamily: 'Cinzel, serif',
              }}>
                {authMode === 'login' ? 'Enter the Cosmos' : 'Join the Cosmos'}
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: 0,
                fontFamily: 'Inter, sans-serif',
              }}>
                {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '14px 18px', marginBottom: '22px',
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px',
                color: '#ef4444', fontSize: '14px', fontFamily: 'Inter, sans-serif',
              }}>
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <label style={{
                display: 'block', marginBottom: '8px', fontWeight: 500,
                color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'Inter, sans-serif',
              }}>
                Email address
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" disabled={loading} required
                style={{
                  width: '100%', padding: '14px 18px',
                  border: '1px solid rgba(138,43,226,0.2)', borderRadius: '12px',
                  fontSize: '15px', boxSizing: 'border-box',
                  backgroundColor: 'rgba(138,43,226,0.06)', color: '#E8D5FF',
                  outline: 'none', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif',
                  opacity: loading ? 0.5 : 1,
                } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(138,43,226,0.5)'
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(138,43,226,0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(138,43,226,0.2)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Name (signup only) */}
            {authMode === 'signup' && (
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{
                  display: 'block', marginBottom: '8px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'Inter, sans-serif',
                }}>
                  Full name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" disabled={loading} required
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: '1px solid rgba(138,43,226,0.2)', borderRadius: '12px',
                    fontSize: '15px', boxSizing: 'border-box',
                    backgroundColor: 'rgba(138,43,226,0.06)', color: '#E8D5FF',
                    outline: 'none', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif',
                    opacity: loading ? 0.5 : 1,
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(138,43,226,0.5)'
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(138,43,226,0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(138,43,226,0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            )}

            {/* Password */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <label style={{
                display: 'block', marginBottom: '8px', fontWeight: 500,
                color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'Inter, sans-serif',
              }}>
                Password
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'signup' ? 'Min 6 characters' : 'Enter password'} disabled={loading} required
                style={{
                  width: '100%', padding: '14px 18px',
                  border: '1px solid rgba(138,43,226,0.2)', borderRadius: '12px',
                  fontSize: '15px', boxSizing: 'border-box',
                  backgroundColor: 'rgba(138,43,226,0.06)', color: '#E8D5FF',
                  outline: 'none', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif',
                  opacity: loading ? 0.5 : 1,
                } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(138,43,226,0.5)'
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(138,43,226,0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(138,43,226,0.2)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Confirm Password (signup only) */}
            {authMode === 'signup' && (
              <div style={{ marginBottom: '30px', position: 'relative' }}>
                <label style={{
                  display: 'block', marginBottom: '8px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'Inter, sans-serif',
                }}>
                  Confirm password
                </label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" disabled={loading} required
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : 'rgba(138,43,226,0.2)'}`,
                    borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box',
                    backgroundColor: 'rgba(138,43,226,0.06)', color: '#E8D5FF',
                    outline: 'none', transition: 'all 0.3s', fontFamily: 'Inter, sans-serif',
                    opacity: loading ? 0.5 : 1,
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(138,43,226,0.5)'
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(138,43,226,0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== password
                      ? 'rgba(239,68,68,0.5)' : 'rgba(138,43,226,0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="cta-btn"
              disabled={loading || !email || !password || (authMode === 'signup' && (!name || password !== confirmPassword))}
              style={{
                width: '100%', padding: '16px',
                background: loading
                  ? 'rgba(138,43,226,0.08)'
                  : 'linear-gradient(135deg, #8B5CF6, #6366F1, #7C3AED)',
                color: loading ? 'rgba(255,255,255,0.25)' : '#fff',
                border: loading ? '1px solid rgba(138,43,226,0.15)' : 'none',
                borderRadius: '12px', fontSize: '16px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.4s', fontFamily: 'Inter, sans-serif',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(138,43,226,0.4)',
                letterSpacing: '0.5px',
                opacity: (!email || !password || (authMode === 'signup' && (!name || password !== confirmPassword))) ? 0.5 : 1,
              } as React.CSSProperties}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{
                    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'chakraSpin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Toggle login/signup */}
            <p style={{
              textAlign: 'center', fontSize: '14px',
              color: 'rgba(255,255,255,0.35)', marginTop: '22px',
              fontFamily: 'Inter, sans-serif',
            }}>
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setPassword(''); setConfirmPassword('') }}
                style={{
                  background: 'none', border: 'none', color: '#a78bfa',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  marginLeft: '6px', fontFamily: 'inherit',
                  textDecoration: 'underline', textUnderlineOffset: '2px',
                }}>
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </form>
        </div>
      </section>

      {/* ============================== */}
      {/* ========= FOOTER ============= */}
      {/* ============================== */}
      <footer style={{
        padding: '36px 48px', backgroundColor: '#010008',
        borderTop: '1px solid rgba(138,43,226,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.3)',
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1px', fontWeight: 600,
          }}>
            DIVYA AI
          </span>
        </div>
        <span style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.15)',
          fontFamily: 'Inter, sans-serif',
        }}>
          Cosmic Intelligence • Built with divine purpose
        </span>
      </footer>
    </div>
  )
}
