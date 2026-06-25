'use client'
import { useEffect, useRef } from 'react'

export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight
    let stars: { x: number, y: number, r: number, vx: number, vy: number, baseX: number, baseY: number }[] = []
    
    // low density for readability
    const numStars = Math.floor((width * height) / 25000)
    
    const initStars = () => {
      stars = []
      for (let i = 0; i < numStars; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        stars.push({
          x, y,
          baseX: x, baseY: y,
          r: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1
        })
      }
    }
    initStars()

    let mouse = { x: -1000, y: -1000 }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initStars()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(200, 200, 255, 0.6)'
      
      stars.forEach(star => {
        star.x += star.vx
        star.y += star.vy
        
        if (star.x < 0 || star.x > width) star.vx *= -1
        if (star.y < 0 || star.y > height) star.vy *= -1

        // Mouse repel interaction
        const dx = mouse.x - star.x
        const dy = mouse.y - star.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 120) {
          star.x -= dx * 0.03
          star.y -= dy * 0.03
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      })
      
      requestAnimationFrame(draw)
    }
    
    let animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none opacity-40 z-0 mix-blend-screen" 
    />
  )
}
