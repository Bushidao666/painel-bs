'use client'

import { useEffect, useState } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Rocket } from 'lucide-react'

interface LaunchCountdownProps {
  targetDate: string
  campaignName: string
}

export function LaunchCountdown({ targetDate, campaignName }: LaunchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const target = new Date(targetDate)
      
      if (target > now) {
        const days = differenceInDays(target, now)
        const hours = differenceInHours(target, now) % 24
        const minutes = differenceInMinutes(target, now) % 60
        const seconds = differenceInSeconds(target, now) % 60
        
        setTimeLeft({ days, hours, minutes, seconds })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Contagem Regressiva
          </h3>
          <p className="text-sm opacity-90">{campaignName}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">{timeLeft.days}</div>
          <div className="text-xs uppercase opacity-90">Dias</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeLeft.hours}</div>
          <div className="text-xs uppercase opacity-90">Horas</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeLeft.minutes}</div>
          <div className="text-xs uppercase opacity-90">Min</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeLeft.seconds}</div>
          <div className="text-xs uppercase opacity-90">Seg</div>
        </div>
      </div>
    </Card>
  )
}