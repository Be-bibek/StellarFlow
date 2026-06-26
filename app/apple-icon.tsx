import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: '40px',
          boxShadow: 'inset 0px 4px 10px rgba(255,255,255,0.8), inset 0px -4px 10px rgba(0,0,0,0.05)',
        }}
      >
        <svg width="100" height="100" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M128 20 L195 115 L128 145 Z" fill="#c084fc" />
          <path d="M128 20 L61 115 L128 145 Z" fill="#818cf8" />
          <path d="M128 160 L195 125 L128 236 Z" fill="#e879f9" />
          <path d="M128 160 L61 125 L128 236 Z" fill="#a78bfa" />
          <path d="M128 145 L195 115 L128 128 Z" fill="#a855f7" />
          <path d="M128 145 L61 115 L128 128 Z" fill="#6366f1" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
