import React from 'react'
import { AssistantMessage } from './AssistantMessage'
import { ChatMessage } from '../../api/models'

// Simple integration test to verify the component renders without crashing
const testMessage: ChatMessage = {
  id: 'test-1',
  role: 'assistant',
  content: 'Hello world!',
  date: new Date().toISOString()
}

// This is just to verify the component can be imported and used
export const IntegrationTest = () => {
  return (
    <div>
      <h2>AssistantMessage Integration Test</h2>
      <AssistantMessage message={testMessage} />
    </div>
  )
}

export default IntegrationTest