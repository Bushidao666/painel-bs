'use client'

import { Card } from '@tremor/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface LeadTemperatureChartProps {
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

const COLORS = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  red: '#EF4444'
}

export function LeadTemperatureChart({ data }: LeadTemperatureChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Temperatura dos Leads</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.color as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}