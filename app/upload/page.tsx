import { VideoUpload } from "@/components/video-upload"

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Making <span className="text-gradient-purple">Accurate Documentation</span> Possible In Seconds
        </h1>
        <p className="text-gray-400 mt-2">Upload your video files to get started with Memories.ai</p>
      </div>

      <VideoUpload />
    </div>
  )
}
