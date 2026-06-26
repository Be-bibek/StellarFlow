import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#08060D',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#eab308',
          fontSize: 100,
          fontWeight: 900,
          borderRadius: '40px',
        }}
      >
        SF
      </div>
    ),
    { ...size }
  )
}
