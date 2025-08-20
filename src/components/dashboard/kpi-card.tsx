import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className
}: KPICardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold">{value}</h2>
            {trend && (
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-zinc-500">{description}</p>
          )}
        </div>
        <div className="rounded-lg bg-zinc-100 p-3">
          <Icon className="h-6 w-6 text-zinc-600" />
        </div>
      </div>
    </Card>
  )
}