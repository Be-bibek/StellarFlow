import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StellarFlow | Treasury OS',
    short_name: 'StellarFlow',
    description: 'Enterprise-grade Corporate Treasury Operating System',
    start_url: '/',
    display: 'standalone',
    background_color: '#08060D',
    theme_color: '#08060D',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
  }
}
