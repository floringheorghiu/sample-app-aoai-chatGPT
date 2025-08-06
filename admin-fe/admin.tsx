// pages/admin.tsx
"use client"
import { useState } from "react"
import { FileText, Settings, Users, MessageCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminAuthDialog } from "@/components/admin-auth-dialog"
import { DocumentUpload } from "@/components/admin/document-upload"
import { SystemPromptEditor } from "@/components/admin/system-prompt-editor"
import { OnboardingConfigEditor } from "@/components/admin/onboarding-config-editor"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("documents")

  return (
    <AdminAuthDialog>
      <div className="min-h-screen bg-[#FEEFF7] py-8">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-lg border-[#D0337D]/20">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/narada-logo.svg" alt="Narada Logo" className="h-8 w-auto" />
              <div className="h-8 w-px bg-[#D0337D]/20"></div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#07050a]">Panou de Administrare</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#D0337D]/30 text-[#07050a] hover:bg-[#D0337D]/5 bg-transparent rounded-medium"
              onClick={() => (window.location.href = "/")}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Înapoi la Chat
            </Button>
          </div>

          <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 lg:w-auto lg:grid-cols-3 bg-white border-[#D0337D]/20 rounded-medium">
              <TabsTrigger
                value="documents"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documente</span>
              </TabsTrigger>
              <TabsTrigger
                value="system-prompt"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Prompt Sistem</span>
              </TabsTrigger>
              <TabsTrigger
                value="onboarding"
                className="flex items-center gap-2 data-[state=active]:bg-[#D0337D] data-[state=active]:text-white text-[#07050a]"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Onboarding</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-6">
              <DocumentUpload />
            </TabsContent>

            <TabsContent value="system-prompt" className="space-y-6">
              <SystemPromptEditor />
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-6">
              <OnboardingConfigEditor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminAuthDialog>
  )
}
