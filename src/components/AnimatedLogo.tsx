const logoStyles = `
  @keyframes spinOuter {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes spinInner {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(25, 195, 125, 0.4)); }
    50% { filter: drop-shadow(0 0 20px rgba(25, 195, 125, 0.8)); }
  }
  @keyframes orbitDot {
    0% { transform: rotate(0deg) translateX(28px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
  }
  @keyframes orbitDot2 {
    0% { transform: rotate(120deg) translateX(28px) rotate(-120deg); }
    100% { transform: rotate(480deg) translateX(28px) rotate(-480deg); }
  }
  @keyframes orbitDot3 {
    0% { transform: rotate(240deg) translateX(28px) rotate(-240deg); }
    100% { transform: rotate(600deg) translateX(28px) rotate(-600deg); }
  }
  @keyframes floatUpDown {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`

interface AnimatedLogoProps {
  size?: number
}

export default function AnimatedLogo({ size = 70 }: AnimatedLogoProps) {
  const scale = size / 70

  return (
    <div style={{
      width: size,
      height: size,
      position: 'relative',
      animation: 'floatUpDown 3s ease-in-out infinite, pulseGlow 3s ease-in-out infinite',
    }}>
      <style>{logoStyles}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 70 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer spinning ring */}
        <g style={{ animation: 'spinOuter 8s linear infinite', transformOrigin: '35px 35px' }}>
          <circle cx="35" cy="35" r="32" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="8 6" fill="none" />
        </g>

        {/* Inner spinning ring (opposite direction) */}
        <g style={{ animation: 'spinInner 6s linear infinite', transformOrigin: '35px 35px' }}>
          <circle cx="35" cy="35" r="24" stroke="url(#gradient2)" strokeWidth="1.5" strokeDasharray="12 4" fill="none" />
        </g>

        {/* Center brain/AI icon */}
        <g style={{ transformOrigin: '35px 35px' }}>
          {/* Hexagon center */}
          <path
            d="M35 14 L50 22 L50 38 L35 46 L20 38 L20 22 Z"
            fill="url(#gradient3)"
            opacity="0.15"
            stroke="url(#gradient3)"
            strokeWidth="1"
          />

          {/* Neural network nodes */}
          <circle cx="35" cy="26" r="3" fill="#19c37d" />
          <circle cx="27" cy="36" r="2.5" fill="#10a37f" />
          <circle cx="43" cy="36" r="2.5" fill="#10a37f" />
          <circle cx="35" cy="42" r="2" fill="#0d8f6f" />

          {/* Neural connections */}
          <line x1="35" y1="26" x2="27" y2="36" stroke="#19c37d" strokeWidth="1" opacity="0.6" />
          <line x1="35" y1="26" x2="43" y2="36" stroke="#19c37d" strokeWidth="1" opacity="0.6" />
          <line x1="27" y1="36" x2="35" y2="42" stroke="#10a37f" strokeWidth="1" opacity="0.4" />
          <line x1="43" y1="36" x2="35" y2="42" stroke="#10a37f" strokeWidth="1" opacity="0.4" />
          <line x1="27" y1="36" x2="43" y2="36" stroke="#10a37f" strokeWidth="1" opacity="0.3" />
        </g>

        {/* Orbiting dots */}
        <g style={{ transformOrigin: '35px 35px' }}>
          <circle cx="35" cy="35" r="0" fill="transparent">
            {/* dot 1 */}
          </circle>
        </g>

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gradient1" x1="0" y1="0" x2="70" y2="70">
            <stop offset="0%" stopColor="#19c37d" />
            <stop offset="50%" stopColor="#10a37f" />
            <stop offset="100%" stopColor="#19c37d" />
          </linearGradient>
          <linearGradient id="gradient2" x1="70" y1="0" x2="0" y2="70">
            <stop offset="0%" stopColor="#5b5fc7" />
            <stop offset="100%" stopColor="#19c37d" />
          </linearGradient>
          <linearGradient id="gradient3" x1="20" y1="14" x2="50" y2="46">
            <stop offset="0%" stopColor="#19c37d" />
            <stop offset="100%" stopColor="#5b5fc7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Orbiting particle 1 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${6 * scale}px`,
        height: `${6 * scale}px`,
        marginTop: `${-3 * scale}px`,
        marginLeft: `${-3 * scale}px`,
        animation: 'orbitDot 4s linear infinite',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: '#19c37d',
          boxShadow: '0 0 6px #19c37d',
        }} />
      </div>

      {/* Orbiting particle 2 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${4 * scale}px`,
        height: `${4 * scale}px`,
        marginTop: `${-2 * scale}px`,
        marginLeft: `${-2 * scale}px`,
        animation: 'orbitDot2 4s linear infinite',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: '#5b5fc7',
          boxShadow: '0 0 6px #5b5fc7',
        }} />
      </div>

      {/* Orbiting particle 3 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${5 * scale}px`,
        height: `${5 * scale}px`,
        marginTop: `${-2.5 * scale}px`,
        marginLeft: `${-2.5 * scale}px`,
        animation: 'orbitDot3 4s linear infinite',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: '#10a37f',
          boxShadow: '0 0 6px #10a37f',
        }} />
      </div>
    </div>
  )
}
