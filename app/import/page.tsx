"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrScanner } from "@/components/qr-scanner"
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

export default function ImportPage() {
  const [scannerActive, setScannerActive] = useState(true)
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importMessage, setImportMessage] = useState("")
  const [importedRun, setImportedRun] = useState<SharedRun | null>(null)
  const router = useRouter()

  const handleScan = (data: string) => {
    try {
      // Parse the URL to extract the import parameter
      const url = new URL(data, window.location.origin)
      const encodedRun = url.searchParams.get("import")

      if (!encodedRun) {
        setImportStatus("error")
        setImportMessage("Invalid QR code. No run data found.")
        setScannerActive(false)
        return
      }

      // Decode the run data
      const decodedRun = JSON.parse(decodeURIComponent(encodedRun))
      const run: SharedRun = decodedRun

      // Validate the run has required fields
      if (!run.id || !run.courseId || !run.runnerName) {
        setImportStatus("error")
        setImportMessage("Invalid run data. Missing required fields.")
        setScannerActive(false)
        return
      }

      // Save the run to localStorage
      const localRunsKey = `local-runs-${run.courseId}`
      const savedRuns = localStorage.getItem(localRunsKey)
      const runs = savedRuns ? JSON.parse(savedRuns) : []
      runs.push(run)
      localStorage.setItem(localRunsKey, JSON.stringify(runs))

      setImportedRun(run)
      setImportStatus("success")
      setImportMessage(`Successfully imported run by ${run.runnerName}!`)
      setScannerActive(false)

      // Redirect to the course page after a short delay
      setTimeout(() => {
        router.push(`/course-runs/${run.courseId}`)
      }, 2000)
    } catch (error) {
      console.error("Error importing run:", error)
      setImportStatus("error")
      setImportMessage("Failed to import run. Please make sure you scanned a valid run QR code.")
      setScannerActive(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Import Run</h1>
            <p className="mt-1 text-muted-foreground">Scan a run QR code to import it</p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <QrScanner isActive={scannerActive} onScan={handleScan} />
          </CardContent>
        </Card>

        {importStatus === "success" && (
          <Card className="border-2 border-green-500 bg-green-500/5">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-600">{importMessage}</h3>
                {importedRun && (
                  <p className="text-sm text-muted-foreground">
                    Redirecting to {importedRun.courseName}...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {importStatus === "error" && (
          <Card className="border-2 border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertCircle className="h-8 w-8 flex-shrink-0 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Import Failed</h3>
                <p className="text-sm text-muted-foreground">{importMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {importStatus === "error" && (
          <Button
            onClick={() => {
              setImportStatus("idle")
              setScannerActive(true)
            }}
            variant="outline"
            className="w-full gap-2 bg-transparent"
          >
            Try Again
          </Button>
        )}
      </div>
    </main>
  )
}
