import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoNo, clientId, status } = body

    console.log("Memories.ai webhook received:", {
      videoNo,
      clientId,
      status,
      timestamp: new Date().toISOString(),
    })

    // Here you can implement logic to:
    // 1. Update your database with the new video status
    // 2. Send notifications to users
    // 3. Trigger other processes based on status

    switch (status) {
      case "PARSE":
        console.log(`Video ${videoNo} is now ready for chat!`)
        // You could send a notification to the user here
        break
      case "UNPARSE":
        console.log(`Video ${videoNo} is not yet processed`)
        break
      case "FAIL":
        console.log(`Video ${videoNo} processing failed`)
        break
      default:
        console.log(`Unknown status ${status} for video ${videoNo}`)
    }

    return NextResponse.json({ success: true, message: "Webhook processed" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
