'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Key, TrendingUp, Sliders } from 'lucide-react'
import { APISettings } from '@/components/settings/api-settings'
import { ScoringSettings } from '@/components/settings/scoring-settings'
import { GeneralSettings } from '@/components/settings/general-settings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-zinc-500">
          Gerencie as configurações do sistema e integrações
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <APISettings />
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <ScoringSettings />
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}