/**
 * @component Logo
 * @description Sarva Logistics brand logo component
 * Renders the S wordmark in dark or light variant
 */
interface LogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

export default function Logo({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
  className = '',
}: LogoProps) {
  const sizes = {
    sm: { s: 28, bar: { w: 22, h: 2 }, gap: 8, word: 13, sub: 6 },
    md: { s: 40, bar: { w: 32, h: 3 }, gap: 12, word: 18, sub: 8 },
    lg: { s: 60, bar: { w: 48, h: 4 }, gap: 16, word: 26, sub: 10 },
  }

  const s = sizes[size]
  const color = variant === 'dark' ? '#ffffff' : '#003418'

  return (
    <div className={`flex items-center gap-${showWordmark ? '3' : '0'} ${className}`}>
      {/* S Mark */}
      <div className="relative flex-shrink-0" style={{ width: s.s, height: s.s + 8 }}>
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: s.s,
            fontWeight: 'bold',
            color,
            lineHeight: 1,
            display: 'block',
          }}
        >
          S
        </span>
        {/* Green accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: s.bar.w,
            height: s.bar.h,
            backgroundColor: '#4CAF50',
            borderRadius: s.bar.h / 2,
          }}
        />
        {/* Arrow */}
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            left: s.bar.w + 2,
            width: 0,
            height: 0,
            borderTop: `${s.bar.h + 2}px solid transparent`,
            borderBottom: `${s.bar.h + 2}px solid transparent`,
            borderLeft: `${s.bar.h + 4}px solid #4CAF50`,
          }}
        />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
          <div
            style={{
              width: 1,
              height: s.s * 0.6,
              backgroundColor: '#4CAF50',
              opacity: 0.4,
              marginRight: s.gap,
              display: 'inline-block',
              verticalAlign: 'middle',
            }}
          />
          <span
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: s.word,
              fontWeight: 'bold',
              color,
              letterSpacing: '0.15em',
              lineHeight: 1.1,
            }}
          >
            SARVA
          </span>
          <span
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: s.sub,
              color: '#4CAF50',
              letterSpacing: '0.4em',
              lineHeight: 1,
            }}
          >
            LOGISTICS
          </span>
        </div>
      )}
    </div>
  )
}
