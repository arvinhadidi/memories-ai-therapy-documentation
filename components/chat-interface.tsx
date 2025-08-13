"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Bot, User, Loader2, Video, AlertCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  type?: "thinking" | "ref" | "content"
  sessionId?: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your Memories.ai assistant. Upload and process videos first, then I can help you analyze and discuss them. What would you like to know?",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedVideoNos, setSelectedVideoNos] = useState<string[]>([])
  const [uniqueId, setUniqueId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [sessionId, setSessionId] = useState<string>()
  const [error, setError] = useState<string>("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isTyping])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    if (selectedVideoNos.length === 0) {
      setError("Please select at least one processed video before chatting.")
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setIsTyping(true)
    setError("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          videoNos: selectedVideoNos,
          uniqueId: uniqueId,
          ...(sessionId && { sessionId }),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send message")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream")
      }

      let fullContent = ""
      let currentSessionId = sessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const data = JSON.parse(line.slice(5))

              // Handle different message types
              if (data.type === "thinking") {
                currentSessionId = data.sessionId
                // Don't add thinking messages to the UI
              } else if (data.type === "content") {
                fullContent += data.content
                // Update the last AI message with accumulated content
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1]
                  if (lastMessage && lastMessage.sender === "ai" && lastMessage.type !== "thinking") {
                    return prev.slice(0, -1).concat({
                      ...lastMessage,
                      content: fullContent,
                    })
                  } else {
                    return [
                      ...prev,
                      {
                        id: `content_${Date.now()}`,
                        content: fullContent,
                        sender: "ai",
                        timestamp: new Date(),
                        type: "content",
                        sessionId: data.sessionId,
                      },
                    ]
                  }
                })
              } else if (data.type === "ref") {
                // Handle reference data (video timestamps, etc.)
                const refContent = `📹 Referenced video segments:\n${
                  data.ref?.map((r: any) => `• ${r.video?.video_name} (${r.video?.duration}s)`).join("\n") ||
                  "Video references"
                }`

                setMessages((prev) => [
                  ...prev,
                  {
                    id: `ref_${Date.now()}`,
                    content: refContent,
                    sender: "ai",
                    timestamp: new Date(),
                    type: "ref",
                    sessionId: data.sessionId,
                  },
                ])
              } else if (data.code === "SUCCESS" && data.data === "Done") {
                // Stream completed successfully
                break
              } else if (data.data && data.data !== "Done") {
                // Handle error responses
                throw new Error(data.data)
              }
            } catch (parseError) {
              console.error("Error parsing streaming data:", parseError)
            }
          }
        }
      }

      setSessionId(currentSessionId)
      setIsTyping(false)
      setIsLoading(false)
    } catch (error) {
      console.error("Error sending message:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, there was an error processing your message. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
      setIsTyping(false)
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <h3 className="font-semibold">Chat Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Video Numbers (comma-separated)</label>
                <Input
                  placeholder="e.g., mavi_video_123, mavi_video_456"
                  value={selectedVideoNos.join(", ")}
                  onChange={(e) =>
                    setSelectedVideoNos(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter video numbers from your uploaded videos (must be in PARSE status)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Unique ID</label>
                <Input value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Should match the ID used for video uploads</p>
              </div>
            </div>

            {sessionId && (
              <div className="text-xs text-muted-foreground">
                Session ID: <code className="bg-muted px-1 rounded">{sessionId}</code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={() => setError("")} className="mt-2 bg-transparent">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">Memories.ai Assistant</h3>
                <p className="text-xs text-muted-foreground">{isTyping ? "Typing..." : "Online"}</p>
              </div>
            </div>

            {selectedVideoNos.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Video className="h-3 w-3" />
                <span>
                  {selectedVideoNos.length} video{selectedVideoNos.length > 1 ? "s" : ""} selected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-2",
                  message.sender === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.sender === "ai" && message.type !== "thinking" && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback
                      className={cn(
                        "bg-muted",
                        message.type === "thinking" && "bg-blue-100",
                        message.type === "ref" && "bg-green-100",
                      )}
                    >
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground ml-12"
                      : "bg-muted text-foreground mr-12",
                    message.type === "thinking" && "bg-blue-50 border border-blue-200",
                    message.type === "ref" && "bg-green-50 border border-green-200",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-1 opacity-70",
                      message.sender === "user" ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.sender === "user" && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-2">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-muted">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2 mr-12">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <CardContent className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedVideoNos.length > 0 ? "Ask about your videos..." : "Select videos first..."}
              disabled={isLoading || selectedVideoNos.length === 0}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading || selectedVideoNos.length === 0}
              size="icon"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line. Videos must be in PARSE status to chat.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
