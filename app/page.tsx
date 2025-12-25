"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, Trash2, Share2, Check, QrCode, List, User, History } from "lucide-react"
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
import QRCode from "qrcode" // Import QRCode library directly

interface SavedSequence {
  id: string
  name: string
  entries: string[]
  createdAt: number
}

export default function HomePage() {
  const [sequences, setSequences] = useState<SavedSequence[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showQrCodes, setShowQrCodes] = useState(false) // Single global toggle for all sequences
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean
    existingSequence: SavedSequence | null
    newSequence: { name: string; entries: string[]; id: string } | null
  }>({ open: false, existingSequence: null, newSequence: null })
  const [newName, setNewName] = useState("")
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [runnerName, setRunnerName] = useState("")
  const [tempRunnerName, setTempRunnerName] = useState("")
  const [isAdminMode, setIsAdminMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem("saved-sequences")
    const loadedSequences = saved ? JSON.parse(saved) : []
    setSequences(loadedSequences)

    const params = new URLSearchParams(window.location.search)
    const sharedSequence = params.get("sequence")
    const sharedName = params.get("name")
    const sharedId = params.get("id")

    if (sharedSequence && sharedId) {
      try {
        const decodedSequence = JSON.parse(decodeURIComponent(sharedSequence))
        const name = sharedName ? decodeURIComponent(sharedName) : "Shared Sequence"

        if (Array.isArray(decodedSequence) && decodedSequence.length > 0) {
          const existingSequence = loadedSequences.find((s: SavedSequence) => s.id === sharedId)

          if (existingSequence) {
            setDuplicateDialog({
              open: true,
              existingSequence,
              newSequence: { name, entries: decodedSequence, id: sharedId },
            })
            setNewName(`${name} (Copy)`)
          } else {
            const newSequence: SavedSequence = {
              id: sharedId,
              name,
              entries: decodedSequence,
              createdAt: Date.now(),
            }
            const updated = [...loadedSequences, newSequence]
            setSequences(updated)
            localStorage.setItem("saved-sequences", JSON.stringify(updated))
          }

          window.history.replaceState({}, "", "/")
        }
      } catch (e) {
        console.error("Failed to parse shared sequence:", e)
      }
    }

    const savedName = localStorage.getItem("runner-name")
    if (savedName) {
      setRunnerName(savedName)
    }

    const adminMode = localStorage.getItem("admin") === "true"
    setIsAdminMode(adminMode)
  }, [])

  const handleDelete = (id: string) => {
    const updated = sequences.filter((s) => s.id !== id)
    setSequences(updated)
    localStorage.setItem("saved-sequences", JSON.stringify(updated))
  }

  const handlePlay = (entries: string[], name: string, id: string) => {
    localStorage.setItem("qr-sequence", JSON.stringify(entries))
    localStorage.setItem("current-sequence-name", name)
    localStorage.setItem("current-sequence-id", id)
    router.push("/play")
  }

  const handleShare = (sequence: SavedSequence) => {
    const shareUrl = getShareUrl(sequence)
    navigator.clipboard.writeText(shareUrl)
    setCopiedId(sequence.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDuplicateAction = (action: "copy" | "replace" | "keep") => {
    if (!duplicateDialog.newSequence || !duplicateDialog.existingSequence) return

    let updated = [...sequences]

    if (action === "copy") {
      const newSequence: SavedSequence = {
        id: crypto.randomUUID(),
        name: newName,
        entries: duplicateDialog.newSequence.entries,
        createdAt: Date.now(),
      }
      updated.push(newSequence)
    } else if (action === "replace") {
      updated = updated.map((s) =>
        s.id === duplicateDialog.existingSequence!.id
          ? {
              ...s,
              name: duplicateDialog.newSequence!.name,
              entries: duplicateDialog.newSequence!.entries,
              createdAt: Date.now(),
            }
          : s,
      )
    }

    setSequences(updated)
    localStorage.setItem("saved-sequences", JSON.stringify(updated))
    setDuplicateDialog({ open: false, existingSequence: null, newSequence: null })
    setNewName("")
  }

  const getShareUrl = (sequence: SavedSequence) => {
    const encodedSequence = encodeURIComponent(JSON.stringify(sequence.entries))
    const encodedName = encodeURIComponent(sequence.name)
    return `${window.location.origin}?sequence=${encodedSequence}&name=${encodedName}&id=${sequence.id}`
  }

  const handleSaveRunnerName = () => {
    if (tempRunnerName.trim()) {
      setRunnerName(tempRunnerName.trim())
      localStorage.setItem("runner-name", tempRunnerName.trim())
      setShowNameDialog(false)
      setTempRunnerName("")
    }
  }

  const handleOpenNameDialog = () => {
    setTempRunnerName(runnerName)
    setShowNameDialog(true)
  }

  const toggleAdminMode = () => {
    const newAdminMode = !isAdminMode
    setIsAdminMode(newAdminMode)
    localStorage.setItem("admin", String(newAdminMode))
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">QR Code Run Tracker</h1>
            <p className="mt-1 text-muted-foreground">Manage and play your saved QR code sequences</p>
            {runnerName && (
              <div className="mt-2 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Runner: {runnerName}</span>
                <Button onClick={handleOpenNameDialog} size="sm" variant="ghost" className="h-6 px-2 text-xs">
                  Change
                </Button>
                <Button
                  onClick={toggleAdminMode}
                  size="sm"
                  variant={isAdminMode ? "default" : "ghost"}
                  className={`h-6 px-2 text-xs ${isAdminMode ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {isAdminMode ? "Admin: ON" : "Admin: OFF"}
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!runnerName && (
              <Button onClick={handleOpenNameDialog} size="lg" variant="outline" className="gap-2 bg-transparent">
                <User className="h-5 w-5" />
                Set Name
              </Button>
            )}
            <Button onClick={() => setShowQrCodes(!showQrCodes)} size="lg" variant="outline" className="gap-2">
              {showQrCodes ? (
                <>
                  <List className="h-5 w-5" />
                  Show Codes
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Show QR
                </>
              )}
            </Button>
            <Link href="/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create New
              </Button>
            </Link>
          </div>
        </div>

        {sequences.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No sequences yet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                Create your first sequence to get started with QR code validation
              </p>
              <Link href="/create">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Sequence
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sequences.map((sequence) => (
              <Card key={sequence.id} className="border-2 transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">{sequence.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {sequence.entries.length} {sequence.entries.length === 1 ? "code" : "codes"} •{" "}
                    {new Date(sequence.createdAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showQrCodes ? (
                    <div className="flex items-center justify-center rounded-lg border bg-white p-4">
                      <QRCodeSVG value={getShareUrl(sequence)} size={200} level="M" />
                    </div>
                  ) : (
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                      {sequence.entries.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <span className="truncate text-muted-foreground">{entry}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePlay(sequence.entries, sequence.name, sequence.id)}
                      size="sm"
                      className="flex-1 gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Play
                    </Button>
                    <Link href={`/sequence-runs/${sequence.id}`}>
                      <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                        <History className="h-4 w-4" />
                        Runs
                      </Button>
                    </Link>
                    <Button onClick={() => handleShare(sequence)} size="sm" variant="outline" className="gap-1">
                      {copiedId === sequence.id ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          Share
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDelete(sequence.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{runnerName ? "Change Your Name" : "Set Your Name"}</DialogTitle>
            <DialogDescription>Your name will be displayed when you complete runs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="runner-name-home">Name</Label>
              <Input
                id="runner-name-home"
                value={tempRunnerName}
                onChange={(e) => setTempRunnerName(e.target.value)}
                placeholder="Enter your name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveRunnerName()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNameDialog(false)} variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleSaveRunnerName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function QRCodeSVG({ value, size }: { value: string; size: number }) {
  const canvasId = `qr-${value.slice(-10)}`

  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (canvas) {
      QRCode.toCanvas(canvas, value, { width: size, margin: 1 })
    }
  }, [value, size])

  return <canvas id={canvasId} />
}
