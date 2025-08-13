"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Upload, MessageCircle } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-white text-lg">Memories.ai</span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={pathname === "/upload" ? "default" : "ghost"}
            size="sm"
            asChild
            className={
              pathname === "/upload"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }
          >
            <Link href="/upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>
          </Button>
          <Button
            variant={pathname === "/chat" ? "default" : "ghost"}
            size="sm"
            asChild
            className={
              pathname === "/chat"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }
          >
            <Link href="/chat" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
