"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Camera } from "lucide-react"

interface QrScannerProps {
  isActive: boolean
  onScan: (data: string) => void
}

export function QrScanner({ isActive, onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanRef = useRef<string>("")
  const lastScanTimeRef = useRef<number>(0)

  useEffect(() => {
    let jsQR: any = null

    const loadJsQR = async () => {
      try {
        const module = await import("jsqr")
        jsQR = module.default
      } catch (err) {
        setError("Failed to load QR scanner library")
      }
    }

    loadJsQR()

    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [isActive])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setHasCamera(true)

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          startScanning()
        }
      }
    } catch (err) {
      setError("Unable to access camera. Please grant camera permissions.")
      setHasCamera(false)
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setHasCamera(false)
  }

  const startScanning = async () => {
    const jsQR = (await import("jsqr")).default

    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const context = canvas.getContext("2d", { willReadFrequently: true })

        if (!context) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          const now = Date.now()
          // Prevent duplicate scans within 2 seconds
          if (code.data !== lastScanRef.current || now - lastScanTimeRef.current > 2000) {
            lastScanRef.current = code.data
            lastScanTimeRef.current = now
            onScan(code.data)

            // Visual feedback
            context.strokeStyle = "#10b981"
            context.lineWidth = 4
            context.beginPath()
            context.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y)
            context.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y)
            context.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y)
            context.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y)
            context.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y)
            context.stroke()
          }
        }
      }
    }, 100)
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {!isActive ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Press Start Run to begin scanning</p>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {hasCamera && (
              <div className="absolute right-3 top-3">
                <div className="flex h-8 items-center gap-2 rounded-full bg-green-500/90 px-3 text-xs font-medium text-white">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  Scanning
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
