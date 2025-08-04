import React from 'react'
import { Button } from './button'
import { Input } from './input'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'

// Simple test component to verify all UI components work
export const TestComponents: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">UI Components Test</h2>
      
      {/* Button Test */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Buttons</h3>
        <div className="space-x-2">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      {/* Input Test */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Input</h3>
        <Input placeholder="Test input..." className="max-w-sm" />
      </div>

      {/* Card Test */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Card</h3>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card component.</p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Test */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Dialog</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>
                This is a test dialog component.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}