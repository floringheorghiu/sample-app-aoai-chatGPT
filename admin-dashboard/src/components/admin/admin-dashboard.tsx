'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentUpload } from './document-upload'
import { SystemPromptEditor } from './system-prompt-editor'
import { OnboardingConfigEditor } from './onboarding-config-editor'

export function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage documents, system prompts, and onboarding configuration</p>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Document Management</TabsTrigger>
          <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Config</TabsTrigger>
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