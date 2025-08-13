"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, Play, FileVideo, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  file: File
  preview: string
  id: string
  videoNo?: string
  videoStatus?: "UNPARSE" | "PARSE" | "FAIL"
  uploadTime?: string
}

export function VideoUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, "idle" | "uploading" | "success" | "error">>({})
  const [errors, setErrors] = useState<string[]>([])
  const [uniqueId, setUniqueId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = ["video/mp4", "video/quicktime", "video/mov"]

    if (!allowedTypes.includes(file.type)) {
      return `${file.name}: Only MP4 and MOV files are supported`
    }

    if (file.size > maxSize) {
      return `${file.name}: File size must be less than 100MB`
    }

    return null
  }

  const processFiles = useCallback((fileList: FileList) => {
    const newErrors: string[] = []
    const validFiles: UploadedFile[] = []

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        newErrors.push(error)
      } else {
        const id = Math.random().toString(36).substr(2, 9)
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          id,
        })
      }
    })

    setErrors(newErrors)
    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [processFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles)
      }
    },
    [processFiles],
  )

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter((f) => f.id !== id)
    })

    // Clean up upload state
    setUploadProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })
    setUploadStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[id]
      return newStatus
    })
  }

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const { file, id } = uploadedFile

    setUploadStatus((prev) => ({ ...prev, [id]: "uploading" }))
    setUploadProgress((prev) => ({ ...prev, [id]: 0 }))

    try {
      const formData = new FormData()
      formData.append("video", file)
      formData.append("unique_id", uniqueId)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const currentProgress = prev[id] || 0
          const newProgress = Math.min(currentProgress + Math.random() * 30, 95)
          return { ...prev, [id]: newProgress }
        })
      }, 500)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      let data
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        // Handle non-JSON responses (HTML error pages, plain text, etc.)
        const textResponse = await response.text()
        data = {
          error: `Server returned non-JSON response: ${textResponse.substring(0, 200)}...`,
          status: response.status,
          statusText: response.statusText,
        }
      }

      if (response.ok && data.success) {
        setUploadProgress((prev) => ({ ...prev, [id]: 100 }))
        setUploadStatus((prev) => ({ ...prev, [id]: "success" }))

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  videoNo: data.videoNo,
                  videoStatus: data.videoStatus,
                  uploadTime: data.uploadTime,
                }
              : f,
          ),
        )
      } else {
        throw new Error(data.error || data.details || `Upload failed with status ${response.status}`)
      }
    } catch (error) {
      setUploadStatus((prev) => ({ ...prev, [id]: "error" }))
      setErrors((prev) => [
        ...prev,
        `Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  const uploadAllFiles = () => {
    files.forEach((file) => {
      if (uploadStatus[file.id] === "idle" || !uploadStatus[file.id]) {
        uploadFile(file)
      }
    })
  }

  const clearErrors = () => {
    setErrors([])
  }

  const getStatusDisplay = (file: UploadedFile) => {
    if (uploadStatus[file.id] === "success" && file.videoStatus) {
      switch (file.videoStatus) {
        case "PARSE":
          return {
            icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
            text: "Ready for chat",
            color: "text-green-600",
          }
        case "UNPARSE":
          return {
            icon: <Clock className="h-4 w-4 text-yellow-500" />,
            text: "Processing...",
            color: "text-yellow-600",
          }
        case "FAIL":
          return {
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            text: "Processing failed",
            color: "text-red-600",
          }
        default:
          return { icon: <Clock className="h-4 w-4 text-gray-500" />, text: "Unknown status", color: "text-gray-600" }
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Drop your videos here</h3>
                <p className="text-sm text-muted-foreground">or click to browse files</p>
                <p className="text-xs text-muted-foreground">Supports MP4 and MOV files up to 100MB</p>
                <p className="text-xs text-blue-600 font-medium">
                  Videos must be processed before you can chat about them
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/mov"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Your Unique ID</p>
              <p className="text-xs text-muted-foreground">Used to identify your uploads</p>
            </div>
            <code className="text-xs bg-muted px-2 py-1 rounded">{uniqueId}</code>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={clearErrors} className="mt-2 bg-transparent">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Selected Files ({files.length})</h3>
              <Button onClick={uploadAllFiles} disabled={files.every((f) => uploadStatus[f.id] === "success")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload All
              </Button>
            </div>

            <div className="space-y-4">
              {files.map((uploadedFile) => {
                const statusDisplay = getStatusDisplay(uploadedFile)
                return (
                  <div key={uploadedFile.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="relative">
                      <video src={uploadedFile.preview} className="w-16 h-16 object-cover rounded" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <FileVideo className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                        {statusDisplay && statusDisplay.icon}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>

                      {uploadedFile.videoNo && (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-muted-foreground">Video ID: {uploadedFile.videoNo}</p>
                          {statusDisplay && (
                            <p className={`text-xs font-medium ${statusDisplay.color}`}>{statusDisplay.text}</p>
                          )}
                        </div>
                      )}

                      {uploadStatus[uploadedFile.id] === "uploading" && (
                        <div className="mt-2">
                          <Progress value={uploadProgress[uploadedFile.id] || 0} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(uploadProgress[uploadedFile.id] || 0)}% uploaded
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      disabled={uploadStatus[uploadedFile.id] === "uploading"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
