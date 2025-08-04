import { useRef, useState, useEffect, useContext, useLayoutEffect, Fragment } from 'react'
import { CommandBarButton, IconButton, Dialog, DialogType, Stack } from '@fluentui/react'
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular } from '@fluentui/react-icons'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import uuid from 'react-uuid'
import { isEmpty } from 'lodash'
import DOMPurify from 'dompurify'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism'

import styles from './Chat.module.css'
// Removed Contoso import - using Narada logo directly
import { XSSAllowTags } from '../../constants/sanatizeAllowables'

import {
  ChatMessage as BaseChatMessage,
  ConversationRequest,
  conversationApi,
  Citation,
  ToolMessageContent,
  AzureSqlServerExecResults,
  ChatResponse,
  getUserInfo,
  Conversation,
  historyGenerate,
  historyUpdate,
  historyClear,
  ChatHistoryLoadingState,
  CosmosDBStatus,
  ErrorMessage,
  ExecResults,
  historyMessageFeedback
} from '../../api'

// Extend ChatMessage to allow citations for assistant messages
type ChatMessage = BaseChatMessage & {
  citations?: Citation[]
}
import { Answer } from '../../components/Answer'
import { QuestionInput } from '../../components/QuestionInput'
import { ChatHistoryPanel } from '../../components/ChatHistory/ChatHistoryPanel'
import ChatMessageComponent from '../../components/ChatMessage'
import { AppStateContext } from '../../state/AppProvider'
import { useBoolean } from '@fluentui/react-hooks'
import { useAppPersonaTheme } from '../../hooks/usePersonaTheme'
import { Plus, MessageSquareIcon } from 'lucide-react'

// Avatar mapping based on persona
const getPersonaAvatar = (persona: string | null) => {
  switch (persona) {
    case 'elev':
      return '/avatars/child_avatar.svg'
    case 'părinte':
      return '/avatars/parent_avatar.svg'
    case 'profesor':
      return '/avatars/teacher_avatar.svg'
    case 'incognito':
      return '/avatars/incognito_avatar.svg'
    default:
      return '/avatars/child_avatar.svg' // Default fallback
  }
}

const enum messageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done'
}

const Chat = () => {
  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled
  const { backgroundClasses, messageClasses } = useAppPersonaTheme()
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false)
  const [activeCitations, setActiveCitations] = useState<Citation[]>([])
  const [isCitationModalOpen, setIsCitationModalOpen] = useState<boolean>(false)
  const [isIntentsPanelOpen, setIsIntentsPanelOpen] = useState<boolean>(false)
  const abortFuncs = useRef([] as AbortController[])
  const [showAuthMessage, setShowAuthMessage] = useState<boolean | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [execResults, setExecResults] = useState<ExecResults[]>([])
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning)
  const [clearingChat, setClearingChat] = useState<boolean>(false)
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true)
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()
  const [logo, setLogo] = useState('')
  const [answerId, setAnswerId] = useState<string>('')

  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: 'Close',
    subText: errorMsg?.subtitle
  }

  const modalProps = {
    titleAriaId: 'labelId',
    subtitleAriaId: 'subTextId',
    isBlocking: true,
    styles: { main: { maxWidth: 450 } }
  }

  const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']
  const NO_CONTENT_ERROR = 'No content in messages object.'

  const restartOnboarding = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
      setErrorMsg({
        title: 'Chat history is not enabled',
        subtitle: subtitle
      })
      toggleErrorDialog()
    }
  }, [appStateContext?.state.isCosmosDBAvailable])

  const handleErrorDialogClose = () => {
    toggleErrorDialog()
    setTimeout(() => {
      setErrorMsg(null)
    }, 500)
  }

  useEffect(() => {
    if (!appStateContext?.state.isLoading) {
      setLogo(ui?.chat_logo || ui?.logo || '/narada-logo.svg')
    }
  }, [appStateContext?.state.isLoading])

  useEffect(() => {
    setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading)
  }, [appStateContext?.state.chatHistoryLoadingState])

  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) {
      setShowAuthMessage(false)
      return
    }
    const userInfoList = await getUserInfo()
    if (userInfoList.length === 0 && window.location.hostname !== '127.0.0.1') {
      setShowAuthMessage(true)
    } else {
      setShowAuthMessage(false)
    }
  }

  let assistantMessage = {} as ChatMessage
  let toolMessage = {} as ChatMessage
  let assistantContent = ''

  useEffect(() => parseExecResults(execResults), [execResults])

  const parseExecResults = (exec_results_: any): void => {
    if (exec_results_ == undefined) return
    const exec_results = exec_results_.length === 2 ? exec_results_ : exec_results_.splice(2)
    appStateContext?.dispatch({
      type: 'SET_ANSWER_EXEC_RESULT',
      payload: { answerId: answerId, exec_result: exec_results }
    })
  }

  const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
    if (typeof resultMessage.content === 'string' && resultMessage.content.includes('all_exec_results')) {
      const parsedExecResults = JSON.parse(resultMessage.content) as AzureSqlServerExecResults
      setExecResults(parsedExecResults.all_exec_results)
      assistantMessage.context = JSON.stringify({
        all_exec_results: parsedExecResults.all_exec_results
      })
    }

    if (resultMessage.role === ASSISTANT) {
      setAnswerId(resultMessage.id)
      assistantContent += resultMessage.content
      assistantMessage = { ...assistantMessage, ...resultMessage }
      assistantMessage.content = assistantContent

      if (resultMessage.context) {
        toolMessage = {
          id: uuid(),
          role: TOOL,
          content: resultMessage.context,
          date: new Date().toISOString()
        }
      }
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([...messages, userMessage, toolMessage, assistantMessage])
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage])
    }
  }

  const makeApiRequestWithoutCosmosDB = async (question: ChatMessage['content'], conversationId?: string) => {
    setIsLoading(true)
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)

    const questionContent =
      typeof question === 'string'
        ? question
        : [
            { type: 'text', text: question[0].text },
            { type: 'image_url', image_url: { url: question[1].image_url.url } }
          ]
    question = typeof question !== 'string' && question[0]?.text?.length > 0 ? question[0].text : question

    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: questionContent as string,
      date: new Date().toISOString()
    }

    let conversation: Conversation | null | undefined
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question as string,
        messages: [userMessage],
        date: new Date().toISOString()
      }
    } else {
      conversation = appStateContext?.state?.currentChat
      if (!conversation) {
        console.error('Conversation not found.')
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
      }
    }

    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
    setMessages(conversation.messages)

    const request: ConversationRequest = {
      messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
    }

    let result = {} as ChatResponse
    try {
      const response = await conversationApi(request, abortController.signal)
      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                } else if (result.error) {
                  throw Error(result.error)
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
          })
        }
        conversation.messages.push(toolMessage, assistantMessage)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, toolMessage, assistantMessage])
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          'An error occurred. Please try again. If the problem persists, please contact the site administrator.'
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        conversation.messages.push(errorChatMsg)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
    }

    return abortController.abort()
  }

  const makeApiRequestWithCosmosDB = async (question: ChatMessage['content'], conversationId?: string) => {
    setIsLoading(true)
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)
    const questionContent =
      typeof question === 'string'
        ? question
        : [
            { type: 'text', text: question[0].text },
            { type: 'image_url', image_url: { url: question[1].image_url.url } }
          ]
    question = typeof question !== 'string' && question[0]?.text?.length > 0 ? question[0].text : question

    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: questionContent as string,
      date: new Date().toISOString()
    }

    let request: ConversationRequest
    let conversation
    if (conversationId) {
      conversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
      if (!conversation) {
        console.error('Conversation not found.')
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
        request = {
          messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
        }
      }
    } else {
      request = {
        messages: [userMessage].filter(answer => answer.role !== ERROR)
      }
      setMessages(request.messages)
    }
    let result = {} as ChatResponse
    var errorResponseMessage = 'Please try again. If the problem persists, please contact the site administrator.'
    try {
      const response = conversationId
        ? await historyGenerate(request, abortController.signal, conversationId)
        : await historyGenerate(request, abortController.signal)
      if (!response?.ok) {
        const responseJson = await response.json()
        errorResponseMessage =
          responseJson.error === undefined ? errorResponseMessage : parseErrorMessage(responseJson.error)
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `There was an error generating a response. Chat history can't be saved at this time. ${errorResponseMessage}`,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          setMessages([...messages, userMessage, errorChatMsg])
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...resultConversation.messages])
        return
      }
      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (!result.choices?.[0]?.messages?.[0].content) {
                  errorResponseMessage = NO_CONTENT_ERROR
                  throw Error()
                }
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                }
                runningText = ''
              } else if (result.error) {
                throw Error(result.error)
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e)
                throw e
              } else {
                console.log('Incomplete message. Continuing...')
              }
            }
          })
        }

        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        } else {
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        }
        if (!resultConversation) {
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        isEmpty(toolMessage)
          ? setMessages([...messages, assistantMessage])
          : setMessages([...messages, toolMessage, assistantMessage])
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage = `An error occurred. ${errorResponseMessage}`
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          if (!result.history_metadata) {
            console.error('Error retrieving data.', result)
            let errorChatMsg: ChatMessage = {
              id: uuid(),
              role: ERROR,
              content: errorMessage,
              date: new Date().toISOString()
            }
            setMessages([...messages, userMessage, errorChatMsg])
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          resultConversation.messages.push(errorChatMsg)
        }
        if (!resultConversation) {
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
    }
    return abortController.abort()
  }

  const clearChat = async () => {
    setClearingChat(true)
    if (appStateContext?.state.currentChat?.id && appStateContext?.state.isCosmosDBAvailable.cosmosDB) {
      let response = await historyClear(appStateContext?.state.currentChat.id)
      if (!response.ok) {
        setErrorMsg({
          title: 'Error clearing current chat',
          subtitle: 'Please try again. If the problem persists, please contact the site administrator.'
        })
        toggleErrorDialog()
      } else {
        appStateContext?.dispatch({
          type: 'DELETE_CURRENT_CHAT_MESSAGES',
          payload: appStateContext?.state.currentChat.id
        })
        appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext?.state.currentChat })
        setActiveCitations([])
        setIsCitationModalOpen(false)
        setIsIntentsPanelOpen(false)
        setMessages([])
      }
    }
    setClearingChat(false)
  }

  const tryGetRaiPrettyError = (errorMessage: string) => {
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
        const jailbreak = innerErrorJson.content_filter_result.jailbreak
        if (jailbreak.filtered === true) {
          reason = 'Jailbreak'
        }

        // Returning the prettified error message
        if (reason !== '') {
          return (
            'The prompt was filtered due to triggering Azure OpenAI’s content filtering system.\n' +
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

  const parseErrorMessage = (errorMessage: string) => {
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

    return tryGetRaiPrettyError(errorMessage)
  }

  const newChat = () => {
    setProcessMessages(messageStatus.Processing)
    setMessages([])
    setIsCitationModalOpen(false)
    setIsIntentsPanelOpen(false)
    setActiveCitations([])
    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null })
    setProcessMessages(messageStatus.Done)
  }

  const stopGenerating = () => {
    abortFuncs.current.forEach(a => a.abort())
    setShowLoadingMessage(false)
    setIsLoading(false)
    setProcessMessages(messageStatus.Done)
  }

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      setMessages(appStateContext.state.currentChat.messages)
    } else {
      setMessages([])
    }
  }, [appStateContext?.state.currentChat])

  useLayoutEffect(() => {
    const saveToDB = async (messages: ChatMessage[], id: string) => {
      const response = await historyUpdate(messages, id)
      return response
    }

    if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
      if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
        if (!appStateContext?.state.currentChat?.messages) {
          console.error('Failure fetching current chat state.')
          return
        }
        const noContentError = appStateContext.state.currentChat.messages.find(m => m.role === ERROR)

        if (!noContentError) {
          saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
            .then(res => {
              if (!res.ok) {
                let errorMessage =
                  "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator."
                let errorChatMsg: ChatMessage = {
                  id: uuid(),
                  role: ERROR,
                  content: errorMessage,
                  date: new Date().toISOString()
                }
                if (!appStateContext?.state.currentChat?.messages) {
                  let err: Error = {
                    ...new Error(),
                    message: 'Failure fetching current chat state.'
                  }
                  throw err
                }
                setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
              }
              return res as Response
            })
            .catch(err => {
              console.error('Error: ', err)
              let errRes: Response = {
                ...new Response(),
                ok: false,
                status: 500
              }
              return errRes
            })
        }
      } else {
      }
      appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat })
      setMessages(appStateContext.state.currentChat.messages)
      setProcessMessages(messageStatus.NotRunning)
    }
  }, [processMessages])

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList()
  }, [AUTH_ENABLED])

  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showLoadingMessage, processMessages])

  // Show all citations for the current answer in a modal, mutually exclusive with chat history
  const onShowCitation = (citations: Citation[]) => {
    // Debug log
    // eslint-disable-next-line no-console
    console.log('Citations for modal:', citations)
    setActiveCitations(citations)
    setIsCitationModalOpen(true)
    // Hide chat history modal if open
    if (appStateContext?.state.isChatHistoryOpen) {
      appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })
    }
  }

  const onShowExecResult = (answerId: string) => {
    setIsIntentsPanelOpen(true)
  }

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank')
    }
  }

  const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool' && typeof message?.content === 'string') {
      try {
        const toolMessage = JSON.parse(message.content) as ToolMessageContent
        return toolMessage.citations
      } catch {
        return []
      }
    }
    return []
  }

  const parsePlotFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool' && typeof message?.content === 'string') {
      try {
        const execResults = JSON.parse(message.content) as AzureSqlServerExecResults
        const codeExecResult = execResults.all_exec_results.at(-1)?.code_exec_result

        if (codeExecResult === undefined) {
          return null
        }
        return codeExecResult.toString()
      } catch {
        return null
      }
      // const execResults = JSON.parse(message.content) as AzureSqlServerExecResults;
      // return execResults.all_exec_results.at(-1)?.code_exec_result;
    }
    return null
  }

  const disabledButton = () => {
    return (
      isLoading ||
      (messages && messages.length === 0) ||
      clearingChat ||
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    )
  }

  // Helper: close citation modal and clear citations
  const closeCitationModal = () => {
    setIsCitationModalOpen(false)
    setActiveCitations([])
  }

  return (
    <div role="main" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showAuthMessage ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack className={styles.chatEmptyState}>
            <ShieldLockRegular
              className={styles.chatIcon}
              style={{ color: 'darkorange', height: '200px', width: '200px' }}
            />
            <h1 className={styles.chatEmptyStateTitle}>Authentication Not Configured</h1>
            <h2 className={styles.chatEmptyStateSubtitle}>
              This app does not have authentication configured. Please add an identity provider by finding your app in the{' '}
              <a href="https://portal.azure.com/" target="_blank">
                Azure Portal
              </a>
              and following{' '}
              <a
                href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization"
                target="_blank">
                these instructions
              </a>
              .
            </h2>
            <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: '20px' }}>
              <strong>Authentication configuration takes a few minutes to apply. </strong>
            </h2>
            <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: '20px' }}>
              <strong>If you deployed in the last 10 minutes, please wait and reload the page after 10 minutes.</strong>
            </h2>
          </Stack>
        </div>
      ) : (
        <div 
          style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'background-color 0.3s'
          }}
          className={backgroundClasses()}
        >
          {/* Header with Title and Actions */}
          <div 
            style={{
              flexShrink: 0,
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              borderBottom: '1px solid #e5e7eb',
              padding: '16px 24px',
              position: 'relative',
              zIndex: 10
            }}
          >
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Asistent AI Narada</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={newChat}
                  disabled={disabledButton()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: '#ec4899',
                    color: 'white',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: disabledButton() ? 'not-allowed' : 'pointer',
                    opacity: disabledButton() ? 0.5 : 1,
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (!disabledButton()) {
                      e.currentTarget.style.backgroundColor = '#db2777'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabledButton()) {
                      e.currentTarget.style.backgroundColor = '#ec4899'
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Conversație nouă
                </button>
                <button
                  onClick={() => appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '1px solid #d1d5db',
                    borderRadius: '9999px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  <MessageSquareIcon className="w-4 h-4" />
                  Istoric conversații
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0
            }}
          >
            <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Welcome Message - Always show */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Welcome Message */}
                  <div className={styles['animate-fade-in']} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <img
                        src="/avatars/chatbot_avatar.svg"
                        alt="AI Assistant"
                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                        onError={e => {
                          e.currentTarget.src = '/narada-logo.svg'
                        }}
                      />
                    </div>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      borderTopLeftRadius: '6px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e5e7eb',
                      maxWidth: '512px'
                    }}>
                      <p style={{
                        color: '#1f2937',
                        fontSize: '16px',
                        lineHeight: '1.6',
                        margin: 0
                      }}>
                        Bun venit! Sunt asistentul tău AI Narada. Văd că ești un elev interesat cum să îmi înțeleg
                        emoțiile și să depășesc momentele grele. Cum te pot ajuta astăzi?
                      </p>
                    </div>
                  </div>

                  {/* Quick questions moved to input area */}
                </div>
                
                {/* User Messages - Show below welcome message */}
                {messages && messages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {messages.map((message, index) => {
                    if (message.role === 'user') {
                      return (
                        <div className={styles['animate-fade-in']} key={message.id} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: '12px' }}>
                          <div 
                            className={messageClasses(true, 'max-w-[512px]')}
                            style={{
                              borderRadius: '16px',
                              borderTopRightRadius: '6px',
                              padding: '20px',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                          >
                            <ChatMessageComponent
                              message={message}
                              isStreaming={false}
                              sanitizeAnswer={appStateContext?.state.frontendSettings?.sanitize_answer}
                            />
                          </div>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img 
                              src={getPersonaAvatar(appStateContext?.state.currentPersona)} 
                              alt="User Avatar" 
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
                            />
                          </div>
                        </div>
                      )
                    } else if (message.role === 'assistant') {
                      // Look for citations in the most recent tool message before this assistant message
                      let citations: Citation[] = []
                      for (let i = index - 1; i >= 0; i--) {
                        if (messages[i].role === 'tool') {
                          citations = parseCitationFromMessage(messages[i])
                          break
                        }
                      }
                      let filteredCitations: Citation[] = []
                      if (citations && citations.length > 0) {
                        filteredCitations = citations
                      }
                      return (
                        <div className={styles['animate-fade-in']} key={message.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img 
                              src="/avatars/chatbot_avatar.svg" 
                              alt="AI Assistant" 
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                              onError={e => {
                                e.currentTarget.src = '/narada-logo.svg'
                              }}
                            />
                          </div>
                          <div style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            borderTopLeftRadius: '6px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            color: '#1f2937',
                            maxWidth: '768px'
                          }}>
                            <ChatMessageComponent
                              message={{ ...message, citations: filteredCitations }}
                              isStreaming={false}
                              onCitationClick={() => onShowCitation(filteredCitations)}
                              sanitizeAnswer={appStateContext?.state.frontendSettings?.sanitize_answer}
                            />
                          </div>
                        </div>
                      )
                    } else if (message.role === 'error') {
                      return (
                        <div className={styles['animate-fade-in']} key={message.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img 
                              src="/avatars/chatbot_avatar.svg" 
                              alt="AI Assistant" 
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                              onError={e => {
                                e.currentTarget.src = '/narada-logo.svg'
                              }}
                            />
                          </div>
                          <div style={{
                            maxWidth: '768px',
                            padding: '20px',
                            borderRadius: '16px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#991b1b',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                          }}>
                            <div style={{ fontSize: '14px' }}>
                              {typeof message.content === 'string' ? message.content : ''}
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      return null
                    }
                    })}
                  </div>
                )}
              </div>
              <div ref={chatMessageStreamEnd} />
            </div>
          </div>

          {/* Quick Questions - Horizontal Scroll */}
          {messages.length === 0 && (
            <div style={{
              padding: '0 24px 16px 24px',
              backgroundColor: 'white'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
                paddingBottom: '4px'
              }}
              // Hide scrollbar for Webkit browsers
              className="quick-questions-scroll"
              >
                <style jsx>{`
                  .quick-questions-scroll::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <button
                  onClick={() => {
                    const question = 'Cum pot vorbi despre ce simt fără să-mi fie rușine?'
                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                      ? makeApiRequestWithCosmosDB(question)
                      : makeApiRequestWithoutCosmosDB(question)
                  }}
                  style={{
                    minWidth: '200px',
                    maxWidth: '200px',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    color: '#1f2937',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    whiteSpace: 'normal',
                    textAlign: 'left',
                    flexShrink: 0
                  }}
                >
                  Cum pot vorbi despre ce simt fără să-mi fie rușine?
                </button>
                <button
                  onClick={() => {
                    const question = 'Cum mă pot calma înainte de un test sau o prezentare?'
                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                      ? makeApiRequestWithCosmosDB(question)
                      : makeApiRequestWithoutCosmosDB(question)
                  }}
                  style={{
                    minWidth: '200px',
                    maxWidth: '200px',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    color: '#1f2937',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    whiteSpace: 'normal',
                    textAlign: 'left',
                    flexShrink: 0
                  }}
                >
                  Cum mă pot calma înainte de un test sau o prezentare?
                </button>
                <button
                  onClick={() => {
                    const question = 'Ce fac când mă simt copleșit de teme și responsabilități?'
                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                      ? makeApiRequestWithCosmosDB(question)
                      : makeApiRequestWithoutCosmosDB(question)
                  }}
                  style={{
                    minWidth: '200px',
                    maxWidth: '200px',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    color: '#1f2937',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    whiteSpace: 'normal',
                    textAlign: 'left',
                    flexShrink: 0
                  }}
                >
                  Ce fac când mă simt copleșit de teme și responsabilități?
                </button>
              </div>
            </div>
          )}

          {/* Input Area - FIXED AT BOTTOM */}
          <div 
            style={{
              flexShrink: 0,
              backgroundColor: 'white',
              borderTop: '1px solid #e5e7eb',
              padding: '16px 24px',
              position: 'relative'
            }}
          >
            <div style={{ maxWidth: '1024px', margin: '0 auto', position: 'relative', height: '120px' }}>
              <div style={{ position: 'relative', height: '100%' }}>
                <QuestionInput
                  placeholder="Întreabă-mă orice..."
                  disabled={processMessages === messageStatus.Processing}
                  onSend={(question, id) => {
                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                      ? makeApiRequestWithCosmosDB(question, id)
                      : makeApiRequestWithoutCosmosDB(question, id)
                  }}
                  conversationId={appStateContext?.state.currentChat?.id || undefined}
                />
              </div>
            </div>
          </div>

          {/* Chat History Panel */}
          {appStateContext?.state.isChatHistoryOpen && (
            <div className={styles['chat-history-modal-overlay']}>
              <div className={styles['chat-history-modal-panel']}>
                <ChatHistoryPanel />
              </div>
              <div className={styles['chat-history-modal-backdrop']} onClick={() => appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })} />
            </div>
          )}

          {/* Citations Panel */}
          {isCitationModalOpen && activeCitations.length > 0 && (
            <div className={styles['chat-history-modal-overlay']}>
              <div className={styles['chat-history-modal-panel']}>
                <div className={styles.citationPanel} tabIndex={0} role="dialog" aria-label="Citation Panel">
                  <Stack
                    aria-label="Citation Panel Header Container"
                    horizontal
                    className={styles.citationPanelHeaderContainer}
                    horizontalAlign="space-between"
                    verticalAlign="center">
                    <span aria-label="Citations" className={styles.citationPanelHeader}>
                      Citations
                    </span>
                    <IconButton
                      iconProps={{ iconName: 'Cancel' }}
                      aria-label="Close citations panel"
                      onClick={closeCitationModal}
                    />
                  </Stack>
                  <div className={styles.citationPanelBody}>
                    {activeCitations.map((citation, index) => (
                      <Fragment key={uuid()}>
                        <h5
                          className={styles.citationPanelTitle}
                          tabIndex={0}
                          title={citation.url || undefined}
                          onClick={() => onViewSource(citation)}
                          style={{
                            cursor: citation.url && !citation.url.includes('blob.core') ? 'pointer' : 'default'
                          }}>
                          {citation.title}
                        </h5>
                        <div tabIndex={0} style={{ marginBottom: 24 }}>
                          <ReactMarkdown
                            linkTarget="_blank"
                            className={styles.citationPanelContent}
                            children={DOMPurify.sanitize(citation.content, { ALLOWED_TAGS: XSSAllowTags })}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          />
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles['chat-history-modal-backdrop']} onClick={closeCitationModal} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Chat
