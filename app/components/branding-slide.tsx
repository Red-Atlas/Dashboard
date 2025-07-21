"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export default function BrandingSlide() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div
        className={`transition-all duration-1000 transform ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Large Logo */}
        <div className="mb-12">
          <Image src="/red-atlas-logo.png" alt="RED Atlas Logo" width={600} height={180} className="h-32 w-auto" />
        </div>

        {/* Tagline */}
        <p className="text-3xl text-gray-600 text-center max-w-4xl leading-relaxed font-bold">
          Know Your Property
        </p>
      </div>
    </div>
  )
}
