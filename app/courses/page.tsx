"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface SavedSequence {
  id: string
  name: string
  entries: string[]
  createdAt: number
}

export default function SequencesPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/")
  }, [router])

  return null
}
