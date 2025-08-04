import { useContext, useEffect, useState } from 'react'
import { AppStateContext } from '../state/AppProvider'

export const useDynamicTitle = () => {
  const [currentTitle, setCurrentTitle] = useState("Asistent AI Narada")
  const appStateContext = useContext(AppStateContext)

  useEffect(() => {
    const currentConversation = appStateContext?.state.currentChat
    const newTitle = currentConversation?.title || "Asistent AI Narada"
    
    // Update both browser title and internal state
    document.title = newTitle
    setCurrentTitle(newTitle)
  }, [appStateContext?.state.currentChat?.title])

  return currentTitle
}