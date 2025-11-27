'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StarfieldProps {
  className?: string
  starCount?: number
  speed?: number
}

export function Starfield({ className, starCount = 300, speed = 0.05 }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let stars: { x: number; y: number; size: number; speed: number; brightness: number }[] = []

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5, // Small, distant stars
          speed: (Math.random() * 0.5 + 0.1) * speed, // Parallax effect
          brightness: Math.random(),
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw black background explicitly (or rely on CSS)
      // ctx.fillStyle = '#000000'
      // ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()

        // Update position (slow drift upwards/rightwards)
        star.y -= star.speed
        // star.x += star.speed * 0.1 

        // Reset if out of bounds
        if (star.y < 0) {
          star.y = canvas.height
          star.x = Math.random() * canvas.width
        }
        
        // Twinkle effect
        star.brightness += (Math.random() - 0.5) * 0.05
        if (star.brightness > 1) star.brightness = 1
        if (star.brightness < 0.2) star.brightness = 0.2
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
    draw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [starCount, speed])

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 z-0 pointer-events-none bg-black', className)}
    />
  )
}
