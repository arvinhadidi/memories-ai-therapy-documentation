import { ChatInterface } from "@/components/chat-interface"

export default function ChatPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground mt-2">Chat with AI about your uploaded videos</p>
      </div>

      <ChatInterface />
    </div>
  )
}
