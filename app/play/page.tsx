"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrScanner } from "@/components/qr-scanner"
import { ValidationTable } from "@/components/validation-table"
import { Play, Square, Timer, ArrowLeft, CheckCircle2, XCircle, Trophy, Share2, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import QRCode from "qrcode"

interface ScanData {
  id: string
  data: string
  timestamp: number
  timeFromStart: string
  isCorrect: boolean
  expectedIndex: number
}

interface SharedRun {
  id: string
  runnerName: string
  courseId: string
  courseName: string
  finalTime: number
  correctScans: Array<{
    data: string
    timeFromStart: number
    expectedIndex: number
  }>
  completedAt: number
}

export default function PlayPage() {
  const [expectedCourse, setExpectedCourse] = useState<string[]>([])
  const [courseName, setCourseName] = useState("")
  const [courseId, setCourseId] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [scans, setScans] = useState<ScanData[]>([])
  const [finalTime, setFinalTime] = useState(0)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [runnerName, setRunnerName] = useState("")
  const [tempName, setTempName] = useState("")
  const [shareQrCode, setShareQrCode] = useState("")
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [scanStatus, setScanStatus] = useState<"searching" | "correct" | "wrong">("searching")
  const startTimeRef = useRef<number | null>(null)
  const completionStartTimeRef = useRef<number | null>(null)
  const scanStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("qr-course")
    const storedName = localStorage.getItem("current-course-name")
    const storedId = localStorage.getItem("current-course-id")
    if (stored) {
      setExpectedCourse(JSON.parse(stored))
      setCourseName(storedName || "Unknown Course")
      setCourseId(storedId || "")
    } else {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Date.now() - startTimeRef.current)
        }
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  useEffect(() => {
    const savedName = localStorage.getItem("runner-name")
    if (savedName) {
      setRunnerName(savedName)
    }
  }, [])

  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleStart = () => {
    startTimeRef.current = Date.now()
    setIsRunning(true)
    setScans([])
    setElapsedTime(0)
    setCurrentIndex(0)
    setIsCompleted(false)
    setFinalTime(0)
    setShareQrCode("")
  }

  const handleStop = () => {
    setIsRunning(false)
    startTimeRef.current = null
  }

  const handleScan = (data: string) => {
    if (!isRunning || !startTimeRef.current) return

    const timestamp = Date.now()
    const timeFromStart = timestamp - startTimeRef.current

    setCurrentIndex((prevIndex) => {
      const expectedData = expectedCourse[prevIndex]
      const isCorrect = data === expectedData

      const newScan: ScanData = {
        id: crypto.randomUUID(),
        data,
        timestamp,
        timeFromStart: formatTime(timeFromStart),
        isCorrect,
        expectedIndex: prevIndex,
      }

      setScans((prev) => [newScan, ...prev])

      // Update scan status
      if (isCorrect) {
        setScanStatus("correct")
        // Play correct sound
        const correctAudio = new Audio("/correct.mp3")
        correctAudio.play().catch((error) => console.log("Error playing correct sound:", error))
      } else {
        setScanStatus("wrong")
        // Play wrong sound
        const wrongAudio = new Audio("/wrong.mp3")
        wrongAudio.play().catch((error) => console.log("Error playing wrong sound:", error))
      }

      // Reset status to searching after 1.5 seconds
      if (scanStatusTimeoutRef.current) {
        clearTimeout(scanStatusTimeoutRef.current)
      }
      scanStatusTimeoutRef.current = setTimeout(() => {
        setScanStatus("searching")
      }, 1500)

      if (isCorrect) {
        if (prevIndex === expectedCourse.length - 1) {
          completionStartTimeRef.current = startTimeRef.current
          setIsRunning(false)
          setIsCompleted(true)
          setFinalTime(timeFromStart)

          setTimeout(() => {
            setScans((currentScans) => {
              const allScans = [newScan, ...currentScans]
              const savedName = localStorage.getItem("runner-name")
              if (!savedName) {
                setShowNameDialog(true)
              } else {
                generateShareQrCode(timeFromStart, allScans)
              }
              return allScans
            })
          }, 0)

          startTimeRef.current = null
          return prevIndex
        } else if (prevIndex < expectedCourse.length - 1) {
          const nextIndex = prevIndex + 1
          return nextIndex
        }
        return prevIndex
      } else {
        return prevIndex
      }
    })
  }

  const generateShareQrCode = async (completionTime: number, allScans: ScanData[]) => {
    console.log("[v0] Generating share QR code")
    console.log("[v0] All scans:", allScans)

    const startTime = completionStartTimeRef.current
    console.log("[v0] Start time from completion ref:", startTime)

    const correctScans = allScans
      .filter((s) => s.isCorrect)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => ({
        data: s.data,
        timeFromStart: startTime ? s.timestamp - startTime : 0,
        expectedIndex: s.expectedIndex,
      }))

    console.log("[v0] Correct scans for sharing:", correctScans)

    const sharedRun: SharedRun = {
      id: crypto.randomUUID(),
      runnerName: runnerName || "Anonymous",
      courseId: courseId,
      courseName: courseName,
      finalTime: completionTime,
      correctScans,
      completedAt: Date.now(),
    }

    console.log("[v0] Shared run object:", sharedRun)

    const localRunsKey = `local-runs-${courseId}`
    const savedLocalRuns = localStorage.getItem(localRunsKey)
    const localRuns = savedLocalRuns ? JSON.parse(savedLocalRuns) : []
    localRuns.push(sharedRun)
    localStorage.setItem(localRunsKey, JSON.stringify(localRuns))
    console.log("[v0] Saved to localStorage with key:", localRunsKey)
    console.log("[v0] All local runs now:", localRuns)

    const encodedRun = encodeURIComponent(JSON.stringify(sharedRun))
    const shareUrl = `${window.location.origin}/runs?import=${encodedRun}`

    try {
      const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 300, margin: 2 })
      setShareQrCode(qrDataUrl)
    } catch (error) {
      console.error("Failed to generate QR code:", error)
    }
  }

  const handleSaveName = () => {
    if (tempName.trim()) {
      setRunnerName(tempName.trim())
      localStorage.setItem("runner-name", tempName.trim())
      setShowNameDialog(false)
      setTempName("")
      setScans((currentScans) => {
        generateShareQrCode(finalTime, currentScans)
        return currentScans
      })
    }
  }

  const handleCopyShareLink = () => {
    const startTime = completionStartTimeRef.current || 0

    const correctScans = scans
      .filter((s) => s.isCorrect)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => ({
        data: s.data,
        timeFromStart: s.timestamp - startTime,
        expectedIndex: s.expectedIndex,
      }))

    const sharedRun: SharedRun = {
      id: crypto.randomUUID(),
      runnerName: runnerName || "Anonymous",
      courseId: courseId,
      courseName: courseName,
      finalTime: finalTime,
      correctScans,
      completedAt: Date.now(),
    }

    const encodedRun = encodeURIComponent(JSON.stringify(sharedRun))
    const shareUrl = `${window.location.origin}/runs?import=${encodedRun}`

    navigator.clipboard.writeText(shareUrl)
    setCopiedShareLink(true)
    setTimeout(() => setCopiedShareLink(false), 2000)
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
  }

  if (expectedCourse.length === 0) {
    return null
  }

  const completedCount = scans.filter((s) => s.isCorrect).length

  if (isCompleted) {
    const reversedScans = [...scans].reverse()

    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/runs">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                View All Runs
              </Button>
            </Link>
          </div>

          <Card className="border-4 border-green-500 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <Trophy className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-green-600">Run Completed!</CardTitle>
              {runnerName && <p className="text-2xl font-semibold text-foreground mt-2">{runnerName}</p>}
              <p className="mt-2 text-xl text-muted-foreground">
                Final Time: <span className="font-mono font-bold text-foreground">{formatTime(finalTime)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {completedCount} correct scans, {scans.length - completedCount} wrong attempts
              </p>
            </CardHeader>
          </Card>

          {shareQrCode && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-center">Share Your Run</CardTitle>
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code to import this run on another device
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="rounded-lg border-4 border-primary/20 bg-white p-4">
                  <img src={shareQrCode || "/placeholder.svg"} alt="Share QR Code" className="h-64 w-64" />
                </div>
                <Button onClick={handleCopyShareLink} variant="outline" className="gap-2 bg-transparent">
                  {copiedShareLink ? (
                    <>
                      <Check className="h-4 w-4" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Copy Share Link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                All Scans (First to Last)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[120px]">Time from Start</TableHead>
                      <TableHead className="w-[120px]">Time from Last</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reversedScans.map((scan, index) => {
                      const prevScan = index > 0 ? reversedScans[index - 1] : null
                      const timeFromLast = prevScan ? formatTime(scan.timestamp - prevScan.timestamp) : "—"

                      return (
                        <TableRow key={scan.id}>
                          <TableCell>
                            {scan.isCorrect ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-medium">Correct</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-destructive">
                                <XCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Wrong</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="break-all font-mono text-sm">{scan.data}</TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">{scan.timeFromStart}</TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">{timeFromLast}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleStart} size="lg" className="flex-1 gap-2">
              <Play className="h-5 w-5" />
              Start New Run
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2 bg-transparent">
                <ArrowLeft className="h-5 w-5" />
                Back to Courses
              </Button>
            </Link>
          </div>
        </div>

        <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Your Name</DialogTitle>
              <DialogDescription>Save your name to track your run results</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="runner-name">Name</Label>
                <Input
                  id="runner-name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Enter your name..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveName()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowNameDialog(false)} variant="ghost">
                Skip
              </Button>
              <Button onClick={handleSaveName}>Save Name</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Play Run</h1>
            </div>
            <p className="mt-1 ml-14 text-muted-foreground">
              Scan QR codes in course ({completedCount}/{expectedCourse.length} completed)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
              <Timer className="h-5 w-5 text-primary" />
              <span className="font-mono text-lg font-semibold tabular-nums text-card-foreground">
                {formatTime(elapsedTime)}
              </span>
            </div>
            {!isRunning ? (
              <Button onClick={handleStart} size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Start Run
              </Button>
            ) : (
              <Button onClick={handleStop} size="lg" variant="destructive" className="gap-2">
                <Square className="h-5 w-5" />
                Stop
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                Camera Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <QrScanner isActive={isRunning} onScan={handleScan} />
                <div className="absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white shadow-lg">
                  {scanStatus === "searching" && (
                    <div className="h-10 w-10 rounded-full bg-blue-500 animate-pulse"></div>
                  )}
                  {scanStatus === "correct" && (
                    <CheckCircle2 className="h-10 w-10 text-green-600" strokeWidth={2.5} />
                  )}
                  {scanStatus === "wrong" && (
                    <XCircle className="h-10 w-10 text-red-600" strokeWidth={2.5} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  Expected Course
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {expectedCourse.map((entry, index) => {
                  const scan = scans.find((s) => s.isCorrect && s.expectedIndex === index)
                  const isCompletedScan = scan !== undefined
                  const isCurrentIndex = index === currentIndex && isRunning

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                        isCurrentIndex
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : isCompletedScan
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-border bg-card"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isCompletedScan ? "bg-green-500/20 text-green-600" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 break-all font-medium text-card-foreground">{entry}</div>
                      {isCompletedScan && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                Scanned Data
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {scans.length} {scans.length === 1 ? "scan" : "scans"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationTable scans={scans} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
