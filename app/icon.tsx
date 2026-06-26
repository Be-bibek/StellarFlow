import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '120px',
          boxShadow: 'inset 0px 4px 20px rgba(255,255,255,0.8), inset 0px -4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <svg width="280" height="280" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top Right */}
          <path d="M128 20 L195 115 L128 145 Z" fill="#c084fc" />
          {/* Top Left */}
          <path d="M128 20 L61 115 L128 145 Z" fill="#818cf8" />
          {/* Bottom Right */}
          <path d="M128 160 L195 125 L128 236 Z" fill="#e879f9" />
          {/* Bottom Left */}
          <path d="M128 160 L61 125 L128 236 Z" fill="#a78bfa" />
          {/* Middle Right */}
          <path d="M128 145 L195 115 L128 128 Z" fill="#a855f7" />
          {/* Middle Left */}
          <path d="M128 145 L61 115 L128 128 Z" fill="#6366f1" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
