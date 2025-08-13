import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.MEMORIES_AI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Memories.ai API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()
    const { message, videoNos, sessionId, uniqueId } = body

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!videoNos || !Array.isArray(videoNos) || videoNos.length === 0) {
      return new Response(JSON.stringify({ error: "At least one video number is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!uniqueId) {
      return new Response(JSON.stringify({ error: "unique_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Prepare request payload for Memories.ai
    const payload = {
      video_nos: videoNos,
      prompt: message,
      unique_id: uniqueId,
      ...(sessionId && { session_id: sessionId }),
    }

    const response = await fetch(`${process.env.MEMORIES_AI_BASE_URL}/serve/api/v1/chat`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      console.error("Memories.ai chat error:", errorData)
      return new Response(
        JSON.stringify({
          error: "Chat request failed",
          details: errorData.msg || "Unknown error",
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                controller.close()
                break
              }
              controller.enqueue(value)
            }
          } catch (error) {
            console.error("Stream error:", error)
            controller.error(error)
          }
        }

        pump()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat error:", error)
    return new Response(JSON.stringify({ error: "Internal server error during chat processing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Handle unsupported methods
export async function GET() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  })
}

export async function PUT() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  })
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  })
}
