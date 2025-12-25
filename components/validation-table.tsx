"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle } from "lucide-react"

interface ScanData {
  id: string
  data: string
  timestamp: number
  timeFromStart: string
  isCorrect: boolean
  expectedIndex: number
}

interface ValidationTableProps {
  scans: ScanData[]
}

export function ValidationTable({ scans }: ValidationTableProps) {
  if (scans.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No scans yet. Start scanning QR codes to see data here.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="w-[80px] font-semibold">Status</TableHead>
            <TableHead className="w-[140px] font-semibold">Time</TableHead>
            <TableHead className="font-semibold">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => (
            <TableRow key={scan.id} className={scan.isCorrect ? "bg-green-500/5" : "bg-red-500/5"}>
              <TableCell>
                {scan.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </TableCell>
              <TableCell className="font-mono text-sm tabular-nums">{scan.timeFromStart}</TableCell>
              <TableCell className="break-all font-medium">{scan.data}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
