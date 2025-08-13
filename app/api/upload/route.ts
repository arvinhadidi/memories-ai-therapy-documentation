import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.MEMORIES_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Memories.ai API key not configured" }, { status: 500 })
    }

    // Check for base URL
    const baseUrl = process.env.MEMORIES_AI_BASE_URL
    if (!baseUrl) {
      return NextResponse.json({ error: "Memories.ai base URL not configured" }, { status: 500 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get("video") as File
    const uniqueId = formData.get("unique_id") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!uniqueId) {
      return NextResponse.json({ error: "unique_id is required" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/mov"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only MP4 and MOV files are supported." }, { status: 400 })
    }

    // Validate file size (50MB limit - reduced from 100MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large. Maximum size is 50MB." }, { status: 400 })
    }

    // Prepare form data for Memories.ai API
    const memoriesFormData = new FormData()
    memoriesFormData.append("file", file)
    memoriesFormData.append("unique_id", uniqueId)
    
    // Optional: Add callback URL for status notifications
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/memories`
    memoriesFormData.append("callback", callbackUrl)

    console.log("Uploading to Memories.ai:", {
      url: `${baseUrl}/serve/api/v1/upload`,
      uniqueId,
      fileName: file.name,
      fileSize: file.size,
      hasApiKey: !!apiKey,
    })

    // Upload to Memories.ai - FIXED: Remove Bearer prefix from Authorization header
    const response = await fetch(`${baseUrl}/serve/api/v1/upload`, {
      method: "POST",
      headers: {
        Authorization: apiKey, // FIXED: Just the raw API key, no Bearer prefix
      },
      body: memoriesFormData,
    })

    const responseText = await response.text()
    console.log("Memories.ai response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500), // Log first 500 chars
    })

    // Parse JSON response
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return NextResponse.json(
        {
          error: "Invalid JSON response from Memories.ai API",
          details: `Response parsing failed. Content: ${responseText.substring(0, 200)}...`,
          status: response.status,
        },
        { status: 502 },
      )
    }

    // Handle API errors (when success: false)
    if (responseData.failed === true || responseData.success === false) {
      console.error("Memories.ai API error:", responseData)
      
      // Handle specific error codes
      if (responseData.code === "9009") {
        return NextResponse.json(
          {
            error: "Permission denied",
            details: "API key authentication failed. Please check your API key.",
            status: response.status,
            apiResponse: responseData,
          },
          { status: 401 },
        )
      }
      
      return NextResponse.json(
        {
          error: "Upload failed",
          details: responseData.msg || "Unknown error from Memories.ai API",
          status: response.status,
          apiResponse: responseData,
        },
        { status: response.status || 400 },
      )
    }

    // Handle successful response
    if (responseData.success === true && responseData.data) {
      return NextResponse.json(
        {
          success: true,
          videoNo: responseData.data.videoNo,
          videoName: responseData.data.videoName,
          videoStatus: responseData.data.videoStatus,
          uploadTime: responseData.data.uploadTime,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          message: "Video uploaded successfully. Processing will begin shortly.",
          note: "Video must be in PARSE status before you can chat about it. You'll be notified when processing is complete.",
        },
        { status: 200 },
      )
    }

    // Handle unexpected response structure
    console.error("Unexpected response structure:", responseData)
    return NextResponse.json(
      {
        error: "Unexpected response from Memories.ai API",
        details: "Response structure doesn't match expected format",
        apiResponse: responseData,
      },
      { status: 502 },
    )

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: "Internal server error during upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
