"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ScanData {
  id: string
  data: string
  timestamp: number
  timeFromStart: string
}

interface ScanTableProps {
  scans: ScanData[]
}

export function ScanTable({ scans }: ScanTableProps) {
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
            <TableHead className="w-[140px] font-semibold">Time</TableHead>
            <TableHead className="font-semibold">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="font-mono text-sm tabular-nums">{scan.timeFromStart}</TableCell>
              <TableCell className="break-all font-medium">{scan.data}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
