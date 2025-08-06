'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentUpload } from './document-upload'
import { SystemPromptEditor } from './system-prompt-editor'
import { OnboardingConfigEditor } from './onboarding-config-editor'

export function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panou de Administrare</h1>
        <p className="text-muted-foreground">Gestionează documente, prompturi de sistem și configurarea onboarding-ului</p>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Gestionare Documente</TabsTrigger>
          <TabsTrigger value="system-prompt">Prompt Sistem</TabsTrigger>
          <TabsTrigger value="onboarding">Configurare Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUpload />
        </TabsContent>

        <TabsContent value="system-prompt" className="space-y-4">
          <SystemPromptEditor />
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <OnboardingConfigEditor />
        </TabsContent>
      </Tabs>
    </div>
  )
}