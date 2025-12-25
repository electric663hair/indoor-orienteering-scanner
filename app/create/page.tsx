"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ListPlus, Trash2, Play, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreatePage() {
  const [entries, setEntries] = useState<string[]>([])
  const [currentEntry, setCurrentEntry] = useState("")
  const [sequenceName, setSequenceName] = useState("")
  const router = useRouter()

  const handleAddEntry = () => {
    if (currentEntry.trim()) {
      setEntries([...entries, currentEntry.trim()])
      setCurrentEntry("")
    }
  }

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddEntry()
    }
  }

  const handleSaveSequence = () => {
    if (entries.length === 0) return

    const name = sequenceName.trim() || `Sequence ${new Date().toLocaleDateString()}`

    const savedSequences = JSON.parse(localStorage.getItem("saved-sequences") || "[]")

    const newSequence = {
      id: crypto.randomUUID(),
      name,
      entries,
      createdAt: Date.now(),
    }

    savedSequences.push(newSequence)
    localStorage.setItem("saved-sequences", JSON.stringify(savedSequences))

    router.push("/")
  }

  const handlePlay = () => {
    if (entries.length > 0) {
      localStorage.setItem("qr-sequence", JSON.stringify(entries))
      router.push("/play")
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Sequence</h1>
            </div>
            <p className="mt-1 ml-14 text-muted-foreground">Build a list of expected QR codes for validation</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveSequence}
              disabled={entries.length === 0}
              size="lg"
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <Save className="h-5 w-5" />
              Save
            </Button>
            <Button onClick={handlePlay} disabled={entries.length === 0} size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Play Run
            </Button>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Save className="h-5 w-5 text-primary" />
              </div>
              Sequence Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="Enter a name for this sequence..."
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ListPlus className="h-5 w-5 text-primary" />
              </div>
              Add Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={currentEntry}
                onChange={(e) => setCurrentEntry(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter expected QR code data..."
                className="flex-1"
              />
              <Button onClick={handleAddEntry} disabled={!currentEntry.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {entries.length}
                </div>
                Expected Sequence
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No entries yet. Add entries above to build your sequence.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 break-all font-medium text-card-foreground">{entry}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEntry(index)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
