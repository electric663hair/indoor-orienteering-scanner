"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Trophy, Trash2, ChevronDown, ChevronUp, Download, Share2, ShareIcon } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import QRCode from "qrcode"
import jsPDF from "jspdf"

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

interface SavedCourse {
  id: string
  name: string
  entries: string[]
  createdAt: number
}

export default function CourseRunsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [runs, setRuns] = useState<SharedRun[]>([])
  const [course, setCourse] = useState<SavedCourse | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showAdminQrCodes, setShowAdminQrCodes] = useState(true)

  useEffect(() => {
    const adminMode = localStorage.getItem("admin") === "true" // Check for admin mode
    setIsAdminMode(adminMode)

    // Load course details
    const savedCourses = localStorage.getItem("saved-courses")
    if (savedCourses) {
      const courses: SavedCourse[] = JSON.parse(savedCourses)
      const foundCourse = courses.find((s) => s.id === courseId)
      if (foundCourse) {
        setCourse(foundCourse)
      } else {
        router.push("/")
        return
      }
    }

    // Load runs for this course
    const localRunsKey = `local-runs-${courseId}`
    const savedRuns = localStorage.getItem(localRunsKey)
    if (savedRuns) {
      const loadedRuns: SharedRun[] = JSON.parse(savedRuns)
      setRuns(loadedRuns)
    }
  }, [courseId, router])

  const handleDelete = (runId: string) => {
    const updated = runs.filter((r) => r.id !== runId)
    setRuns(updated)
    const localRunsKey = `local-runs-${courseId}`
    localStorage.setItem(localRunsKey, JSON.stringify(updated))
  }

  const handleDownloadQRCode = async (data: string, index: number) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(data, { width: 300, margin: 1 })
      const link = document.createElement("a")
      link.href = qrDataUrl
      const label = index === 0 ? "Start" : index === course!.entries.length - 1 ? "Finish" : `Control-${index}`
      link.download = `${course!.name}-${label}-${data}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading QR code:", error)
    }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
  }

  const sortedRuns = [...runs].sort((a, b) => a.finalTime - b.finalTime)

  const handleDownloadPDF = async () => {
    if (!course) return

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const qrSize = 55
    const spacing = 5
    const cols = 3
    const rows = 5

    pdf.setFontSize(16)
    pdf.text(course.name, pageWidth / 2, margin + 5, { align: "center" })

    let currentX = margin
    let currentY = margin + 15
    let pageItemCount = 0

    for (let index = 0; index < course.entries.length; index++) {
      const data = course.entries[index]

      // Check if we need to move to the next page (either by item count or by vertical space)
      if (pageItemCount >= cols * rows || currentY + qrSize + 10 > pageHeight - margin) {
        pdf.addPage()
        currentX = margin
        currentY = margin
        pageItemCount = 0
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(data, { width: 300, margin: 1 })
        pdf.addImage(qrDataUrl, "PNG", currentX, currentY, qrSize, qrSize)

        pdf.setFontSize(8)
        pdf.text(data, currentX + qrSize / 2, currentY + qrSize + 3, { align: "center" })

        pdf.setFontSize(7)
        const label = index === 0 ? "Start" : index === course.entries.length - 1 ? "Finish" : ""
        pdf.text(label, currentX + qrSize / 2, currentY + qrSize + 6, { align: "center" })
      } catch (error) {
        console.error("Error generating QR code for PDF:", error)
      }

      currentX += qrSize + spacing
      pageItemCount++

      if (pageItemCount % cols === 0) {
        currentX = margin
        currentY += qrSize + 10
      }
    }

    pdf.save(`${course.name}-qr-codes.pdf`)
  }

  const getLegColor = (controlIndex: number, timeFromLast: number) => {
    // Collect all times for this leg across all runners
    const legTimes: number[] = []

    runs.forEach((run) => {
      const sortedScans = [...run.correctScans].sort((a, b) => a.expectedIndex - b.expectedIndex)
      const scan = sortedScans.find((s) => s.expectedIndex === controlIndex)
      if (scan) {
        const prevScan = controlIndex > 0 ? sortedScans.find((s) => s.expectedIndex === controlIndex - 1) : null
        const legTime = prevScan ? scan.timeFromStart - prevScan.timeFromStart : scan.timeFromStart
        legTimes.push(legTime)
      }
    })

    // Sort times and count ranks properly with ties
    const sortedTimes = [...legTimes].sort((a, b) => a - b)
    let currentRank = 0

    for (let i = 0; i < sortedTimes.length; i++) {
      if (i === 0 || sortedTimes[i] !== sortedTimes[i - 1]) {
        currentRank = i
      }

      if (sortedTimes[i] === timeFromLast) {
        if (currentRank === 0) return "text-green-600 font-bold" // Fastest
        if (currentRank === 1) return "text-orange-600 font-bold" // Second
        if (currentRank === 2) return "text-blue-600 font-bold" // Third
        return "text-gray-500" // All others
      }
    }

    return "text-gray-500"
  }

  const getTotalColor = (controlIndex: number, totalTime: number) => {
    // Collect all total times for this control across all runners
    const totalTimes: number[] = []

    runs.forEach((run) => {
      const sortedScans = [...run.correctScans].sort((a, b) => a.expectedIndex - b.expectedIndex)
      const scan = sortedScans.find((s) => s.expectedIndex === controlIndex)
      if (scan) {
        totalTimes.push(scan.timeFromStart)
      }
    })

    // Sort times and count ranks properly with ties
    const sortedTimes = [...totalTimes].sort((a, b) => a - b)
    let currentRank = 0

    for (let i = 0; i < sortedTimes.length; i++) {
      if (i === 0 || sortedTimes[i] !== sortedTimes[i - 1]) {
        currentRank = i
      }

      if (sortedTimes[i] === totalTime) {
        if (currentRank === 0) return "text-green-600 font-semibold" // Fastest
        if (currentRank === 1) return "text-orange-600 font-semibold" // Second
        if (currentRank === 2) return "text-blue-600 font-semibold" // Third
        return "text-gray-500" // All others
      }
    }

    return "text-gray-500"
  }

  const getShareUrl = () => {
    if (!course) return ""
    const encodedEntries = encodeURIComponent(JSON.stringify(course.entries))
    const encodedName = encodeURIComponent(course.name)
    return `${typeof window !== "undefined" ? window.location.origin : ""}?course=${encodedEntries}&name=${encodedName}&id=${course.id}`
  }

  if (!course) {
    return null
  }

  const numControls = course.entries.length

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{course.name}</h1>
              <p className="mt-1 text-muted-foreground">All runs completed on this device</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {runs.length} {runs.length === 1 ? "Runner" : "Runners"}
            </span>
          </div>
        </div>

        {isAdminMode && course && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-primary">Admin: Control QR Codes</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => setShowAdminQrCodes(!showAdminQrCodes)}
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                  >
                    {showAdminQrCodes ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showAdminQrCodes && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {course.entries.map((data, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4">
                      <div className="rounded-lg bg-white p-2">
                        <QRCodeCanvas value={data} size={120} />
                      </div>
                      <div className="text-center">
                        <div className="mt-1 font-mono text-sm font-bold">{data}</div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {index === 0 ? "Start" : index === course.entries.length - 1 ? "Finish" : ""}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownloadQRCode(data, index)}
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full gap-2"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl">Course QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-muted-foreground">
              Share this QR code to let others access this course
            </p>
            <div className="rounded-lg bg-white p-4">
              <QRCodeCanvas value={getShareUrl()} size={200} />
            </div>
            <Button
              onClick={e => {
                navigator.clipboard.writeText(getShareUrl());
                e.target.innerHTML = "Link Copied"
              }}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <Share2 className="h-4 w-4" />
              Share Course with Link
            </Button>
          </CardContent>
        </Card>

        {runs.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No runs yet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Complete a run for this route to see your results here
              </p>
              <Link href="/">
                <Button size="lg" className="gap-2">
                  <ArrowLeft className="h-5 w-5" />
                  Back to Routes
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead className="w-[60px]">Rank</TableHead> */}
                      <TableHead className="min-w-[150px]">Runner</TableHead>
                      <TableHead className="w-[120px]">Total Time</TableHead>
                      {course.entries.map((data, index) => (
                        <TableHead key={index} className="min-w-[100px] text-center">
                          {`${index === 0 ? "Start" : index === course.entries.length - 1 ? "Finish" : index} - [${data}]`}
                        </TableHead>
                      ))}
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRuns.map((run, runIndex) => {
                      // Sort scans by control order
                      const sortedScans = [...run.correctScans].sort((a, b) => a.expectedIndex - b.expectedIndex)

                      return (
                        <TableRow key={run.id}>
                          {/* <TableCell>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {runIndex + 1}
                            </div>
                          </TableCell> */}
                          <TableCell className="font-semibold">{run.runnerName}</TableCell>
                          <TableCell className="font-mono text-sm font-bold tabular-nums">
                            {formatTime(run.finalTime)}
                          </TableCell>
                          {Array.from({ length: numControls }).map((_, controlIndex) => {
                            const scan = sortedScans.find((s) => s.expectedIndex === controlIndex)
                            if (!scan) {
                              return (
                                <TableCell key={controlIndex} className="text-center text-muted-foreground">
                                  —
                                </TableCell>
                              )
                            }

                            const prevScan =
                              controlIndex > 0 ? sortedScans.find((s) => s.expectedIndex === controlIndex - 1) : null
                            const legTimeMs = prevScan
                              ? scan.timeFromStart - prevScan.timeFromStart
                              : scan.timeFromStart
                            const timeFromLast = formatTime(legTimeMs)

                            const colorClass = getLegColor(controlIndex, legTimeMs)
                            const totalColorClass = getTotalColor(controlIndex, scan.timeFromStart)

                            return (
                              <TableCell key={controlIndex} className="text-center">
                                <div className="flex flex-col gap-1">
                                  <span className={`font-mono text-xs font-semibold ${colorClass}`}>
                                    {timeFromLast}
                                  </span>
                                  <span className={`font-mono text-xs ${totalColorClass}`}>
                                    {formatTime(scan.timeFromStart)}
                                  </span>
                                </div>
                              </TableCell>
                            )
                          })}
                          <TableCell>
                            <Button
                              onClick={() => handleDelete(run.id)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function QRCodeCanvas({ value, size }: { value: string; size: number }) {
  const canvasId = `qr-admin-${value.slice(0, 10)}`

  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (canvas) {
      QRCode.toCanvas(canvas, value, { width: size, margin: 1 })
    }
  }, [value, size, canvasId])

  return <canvas id={canvasId} />
}
