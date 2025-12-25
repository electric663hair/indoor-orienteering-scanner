"use client"

import { useEffect } from "react"
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

export default function RunsImportPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encodedRun = params.get("import")

    if (encodedRun) {
      try {
        // Decode the run data
        const decodedRun = JSON.parse(decodeURIComponent(encodedRun))
        const run: SharedRun = decodedRun

        // Validate the run has required fields
        if (!run.id || !run.courseId || !run.runnerName) {
          console.error("Invalid run data. Missing required fields.")
          router.push("/")
          return
        }

        // Save the run to localStorage
        const localRunsKey = `local-runs-${run.courseId}`
        const savedRuns = localStorage.getItem(localRunsKey)
        const runs = savedRuns ? JSON.parse(savedRuns) : []
        runs.push(run)
        localStorage.setItem(localRunsKey, JSON.stringify(runs))

        // Also save the course if it doesn't exist
        const savedCourses = localStorage.getItem("saved-courses")
        const courses = savedCourses ? JSON.parse(savedCourses) : []
        const courseExists = courses.find((c: any) => c.id === run.courseId)

        if (!courseExists) {
          const newCourse = {
            id: run.courseId,
            name: run.courseName,
            entries: run.correctScans.map(s => s.data),
            createdAt: Date.now(),
          }
          courses.push(newCourse)
          localStorage.setItem("saved-courses", JSON.stringify(courses))
        }

        // Clear the URL and redirect to the course page
        window.history.replaceState({}, "", "/")
        router.push(`/course-runs/${run.courseId}`)
      } catch (error) {
        console.error("Error importing run:", error)
        router.push("/")
      }
    } else {
      // No import parameter, redirect to home
      router.push("/")
    }
  }, [router])

  return null
}
