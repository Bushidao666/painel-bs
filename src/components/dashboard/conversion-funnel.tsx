'use client'

import { Card, ProgressBar } from '@tremor/react'

interface ConversionFunnelProps {
  data: {
    stage: string
    count: number
    percentage: number
  }[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Funil de Conversão</h3>
      <div className="space-y-4">
        {data.map((stage, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{stage.stage}</span>
              <span className="text-zinc-500">{stage.count} ({stage.percentage}%)</span>
            </div>
            <ProgressBar value={stage.percentage} color="yellow" />
          </div>
        ))}
      </div>
    </Card>
  )
}