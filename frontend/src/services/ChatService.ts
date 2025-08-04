import {
  ChatMessage,
  ChatResponse,
  Citation,
  Conversation,
  ConversationRequest,
  ToolMessageContent,
  AzureSqlServerExecResults,
  conversationApi,
  historyGenerate,
  historyUpdate,
  historyMessageFeedback,
  historyClear,
  historyDelete,
  historyRename,
  ExecResults,
  ErrorMessage
} from '../api'
import uuid from 'react-uuid'
import { isEmpty } from 'lodash'

export interface StreamingMessage {
  id: string
  role: string
  content: string
  date: string
  isComplete: boolean
}

export interface StreamingResponse {
  message: StreamingMessage
  citations?: Citation[]
  execResults?: ExecResults[]
  error?: string
  isComplete: boolean
}

export interface ChatServiceConfig {
  onMessageUpdate?: (response: StreamingResponse) => void
  onError?: (error: ErrorMessage) => void
  onComplete?: () => void
}

/**
 * ChatService provides a clean wrapper around the existing API functions
 * while maintaining 100% compatibility with the current backend implementation.
 * 
 * This service layer preserves the exact NDJSON parsing logic and streaming
 * behavior from the original Chat.tsx implementation.
 */
export class ChatService {
  private abortController: AbortController | null = null
  private config: ChatServiceConfig

  constructor(config: ChatServiceConfig = {}) {
    this.config = config
  }

  /**
   * Streams a conversation using the existing conversationApi without CosmosDB
   * Maintains exact NDJSON parsing logic from original Chat.tsx
   */
  async *streamConversationWithoutCosmosDB(
    messages: ChatMessage[],
    conversationId?: string
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    this.abortController = new AbortController()
    
    const request: ConversationRequest = {
      messages: messages.filter(msg => msg.role !== 'error')
    }

    let result = {} as ChatResponse
    let assistantMessage = {} as ChatMessage
    let toolMessage = {} as ChatMessage
    let assistantContent = ''

    try {
      const response = await conversationApi(request, this.abortController.signal)
      
      if (!response?.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      let runningText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder('utf-8').decode(value)
        const objects = text.split('\n')

        for (const obj of objects) {
          try {
            if (obj !== '' && obj !== '{}') {
              runningText += obj
              result = JSON.parse(runningText)
              
              if (result.choices?.length > 0) {
                result.choices[0].messages.forEach(msg => {
                  msg.id = result.id
                  msg.date = new Date().toISOString()
                })

                for (const resultObj of result.choices[0].messages) {
                  // Process exec results if present
                  if (typeof resultObj.content === "string" && resultObj.content.includes('all_exec_results')) {
                    const parsedExecResults = JSON.parse(resultObj.content) as AzureSqlServerExecResults
                    assistantMessage.context = JSON.stringify({
                      all_exec_results: parsedExecResults.all_exec_results
                    })
                  }

                  if (resultObj.role === 'assistant') {
                    assistantContent += resultObj.content
                    assistantMessage = { ...assistantMessage, ...resultObj }
                    assistantMessage.content = assistantContent

                    if (resultObj.context) {
                      toolMessage = {
                        id: uuid(),
                        role: 'tool',
                        content: resultObj.context,
                        date: new Date().toISOString()
                      }
                    }

                    // Parse citations from tool message if available
                    const citations = this.parseCitationFromMessage(toolMessage)

                    yield {
                      message: {
                        id: assistantMessage.id,
                        role: assistantMessage.role,
                        content: assistantMessage.content as string,
                        date: assistantMessage.date,
                        isComplete: false
                      },
                      citations,
                      isComplete: false
                    }
                  }

                  if (resultObj.role === 'tool') {
                    toolMessage = resultObj
                  }
                }
              } else if (result.error) {
                throw new Error(result.error)
              }
              runningText = ''
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              console.error(e)
              throw e
            } else {
              console.log('Incomplete message. Continuing...')
            }
          }
        }
      }

      // Final complete message
      const citations = this.parseCitationFromMessage(toolMessage)
      yield {
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content as string,
          date: assistantMessage.date,
          isComplete: true
        },
        citations,
        isComplete: true
      }

    } catch (error) {
      if (!this.abortController.signal.aborted) {
        let errorMessage = 'An error occurred. Please try again. If the problem persists, please contact the site administrator.'
        
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = this.parseErrorMessage(errorMessage)

        yield {
          message: {
            id: uuid(),
            role: 'error',
            content: errorMessage,
            date: new Date().toISOString(),
            isComplete: true
          },
          error: errorMessage,
          isComplete: true
        }
      }
    }
  }

  /**
   * Streams a conversation using the existing historyGenerate with CosmosDB
   * Maintains exact NDJSON parsing logic from original Chat.tsx
   */
  async *streamConversationWithCosmosDB(
    messages: ChatMessage[],
    conversationId?: string
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    this.abortController = new AbortController()
    
    const request: ConversationRequest = {
      messages: messages.filter(msg => msg.role !== 'error')
    }

    let result = {} as ChatResponse
    let assistantMessage = {} as ChatMessage
    let toolMessage = {} as ChatMessage
    let assistantContent = ''
    const NO_CONTENT_ERROR = 'No content in messages object.'

    try {
      const response = conversationId
        ? await historyGenerate(request, this.abortController.signal, conversationId)
        : await historyGenerate(request, this.abortController.signal)

      if (!response?.ok) {
        const responseJson = await response.json()
        const errorMessage = responseJson.error === undefined 
          ? 'Please try again. If the problem persists, please contact the site administrator.'
          : this.parseErrorMessage(responseJson.error)
        
        throw new Error(`There was an error generating a response. Chat history can't be saved at this time. ${errorMessage}`)
      }

      if (!response?.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      let runningText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder('utf-8').decode(value)
        const objects = text.split('\n')

        for (const obj of objects) {
          try {
            if (obj !== '' && obj !== '{}') {
              runningText += obj
              result = JSON.parse(runningText)
              
              if (!result.choices?.[0]?.messages?.[0].content) {
                throw new Error(NO_CONTENT_ERROR)
              }

              if (result.choices?.length > 0) {
                result.choices[0].messages.forEach(msg => {
                  msg.id = result.id
                  msg.date = new Date().toISOString()
                })

                for (const resultObj of result.choices[0].messages) {
                  if (resultObj.role === 'assistant') {
                    assistantContent += resultObj.content
                    assistantMessage = { ...assistantMessage, ...resultObj }
                    assistantMessage.content = assistantContent

                    if (resultObj.context) {
                      toolMessage = {
                        id: uuid(),
                        role: 'tool',
                        content: resultObj.context,
                        date: new Date().toISOString()
                      }
                    }

                    // Parse citations from tool message if available
                    const citations = this.parseCitationFromMessage(toolMessage)

                    yield {
                      message: {
                        id: assistantMessage.id,
                        role: assistantMessage.role,
                        content: assistantMessage.content as string,
                        date: assistantMessage.date,
                        isComplete: false
                      },
                      citations,
                      isComplete: false
                    }
                  }

                  if (resultObj.role === 'tool') {
                    toolMessage = resultObj
                  }
                }
              }
              runningText = ''
            } else if (result.error) {
              throw new Error(result.error)
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              console.error(e)
              throw e
            } else {
              console.log('Incomplete message. Continuing...')
            }
          }
        }
      }

      // Final complete message
      const citations = this.parseCitationFromMessage(toolMessage)
      yield {
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content as string,
          date: assistantMessage.date,
          isComplete: true
        },
        citations,
        isComplete: true
      }

    } catch (error) {
      if (!this.abortController.signal.aborted) {
        let errorMessage = `An error occurred. Please try again. If the problem persists, please contact the site administrator.`
        
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        errorMessage = this.parseErrorMessage(errorMessage)

        yield {
          message: {
            id: uuid(),
            role: 'error',
            content: errorMessage,
            date: new Date().toISOString(),
            isComplete: true
          },
          error: errorMessage,
          isComplete: true
        }
      }
    }
  }

  /**
   * Parses citations from tool messages using the exact logic from Chat.tsx
   */
  parseCitationFromMessage(message: ChatMessage): Citation[] {
    if (message?.role && message?.role === 'tool' && typeof message?.content === "string") {
      try {
        const toolMessage = JSON.parse(message.content) as ToolMessageContent
        return toolMessage.citations || []
      } catch {
        return []
      }
    }
    return []
  }

  /**
   * Updates conversation history using existing historyUpdate API
   */
  async updateConversationHistory(messages: ChatMessage[], conversationId: string): Promise<Response> {
    return await historyUpdate(messages, conversationId)
  }

  /**
   * Submits message feedback using existing historyMessageFeedback API
   */
  async submitMessageFeedback(messageId: string, feedback: string): Promise<Response> {
    return await historyMessageFeedback(messageId, feedback)
  }

  /**
   * Clears conversation history using existing historyClear API
   */
  async clearConversationHistory(conversationId: string): Promise<Response> {
    return await historyClear(conversationId)
  }

  /**
   * Deletes a conversation using existing historyDelete API
   */
  async deleteConversation(conversationId: string): Promise<Response> {
    return await historyDelete(conversationId)
  }

  /**
   * Renames a conversation using existing historyRename API
   */
  async renameConversation(conversationId: string, title: string): Promise<Response> {
    return await historyRename(conversationId, title)
  }

  /**
   * Aborts the current streaming operation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Parses error messages using the exact logic from Chat.tsx
   * Includes RAI (Responsible AI) content filtering error handling
   */
  private parseErrorMessage(errorMessage: string): string {
    let errorCodeMessage = errorMessage.substring(0, errorMessage.indexOf('-') + 1)
    const innerErrorCue = "{\\'error\\': {\\'message\\': "
    
    if (errorMessage.includes(innerErrorCue)) {
      try {
        let innerErrorString = errorMessage.substring(errorMessage.indexOf(innerErrorCue))
        if (innerErrorString.endsWith("'}}")) {
          innerErrorString = innerErrorString.substring(0, innerErrorString.length - 3)
        }
        innerErrorString = innerErrorString.replaceAll("\\'", "'")
        let newErrorMessage = errorCodeMessage + ' ' + innerErrorString
        errorMessage = newErrorMessage
      } catch (e) {
        console.error('Error parsing inner error message: ', e)
      }
    }

    return this.tryGetRaiPrettyError(errorMessage)
  }

  /**
   * Handles RAI (Responsible AI) content filtering errors
   * Uses exact logic from Chat.tsx
   */
  private tryGetRaiPrettyError(errorMessage: string): string {
    try {
      // Using a regex to extract the JSON part that contains "innererror"
      const match = errorMessage.match(/'innererror': ({.*})\}\}/)
      if (match) {
        // Replacing single quotes with double quotes and converting Python-like booleans to JSON booleans
        const fixedJson = match[1]
          .replace(/'/g, '"')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
        const innerErrorJson = JSON.parse(fixedJson)
        let reason = ''
        
        // Check if jailbreak content filter is the reason of the error
        const jailbreak = innerErrorJson.content_filter_result?.jailbreak
        if (jailbreak?.filtered === true) {
          reason = 'Jailbreak'
        }

        // Returning the prettified error message
        if (reason !== '') {
          return (
            'The prompt was filtered due to triggering Azure OpenAI\'s content filtering system.\n' +
            'Reason: This prompt contains content flagged as ' +
            reason +
            '\n\n' +
            'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
          )
        }
      }
    } catch (e) {
      console.error('Failed to parse the error:', e)
    }
    return errorMessage
  }
}

export default ChatService