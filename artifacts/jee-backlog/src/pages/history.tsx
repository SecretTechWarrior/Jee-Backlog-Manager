import { useState } from "react"
import { useUndoLastAction, getGetHistoryQueryKey } from "@workspace/api-client-react"
import type { HistoryEntry } from "@workspace/api-client-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/utils"
import { History as HistoryIcon, Undo2, PlusCircle, CheckCircle2, FileEdit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function History() {
  const [filter, setFilter] = useState("all")
  const { data: history, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['history', filter],
    queryFn: async () => {
      const params = new URLSearchParams(filter !== 'all' ? { filter } : {})
      const res = await fetch(`/api/history?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })
  
  const { mutate: undo, isPending: isUndoing } = useUndoLastAction()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleUndo = () => {
    undo(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast({ title: "Action undone", description: res.message })
          queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() })
        } else {
          toast({ title: "Cannot undo", description: res.message, variant: "destructive" })
        }
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    })
  }

  // Group history by date
  const grouped = history?.reduce((acc, entry) => {
    const date = new Date(entry.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {} as Record<string, typeof history>)

  const ActionIcon = ({ action }: { action: string }) => {
    switch (action) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'added_lectures': return <PlusCircle className="h-5 w-5 text-blue-500" />
      case 'created': return <FileEdit className="h-5 w-5 text-purple-500" />
      case 'deleted': return <Trash2 className="h-5 w-5 text-red-500" />
      case 'updated': return <FileEdit className="h-5 w-5 text-orange-500" />
      default: return <HistoryIcon className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History Feed</h1>
          <p className="text-muted-foreground mt-1">Timeline of all your activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleUndo} disabled={isUndoing || !history?.length}>
            <Undo2 className="h-4 w-4 mr-2" />
            Undo Last
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3 pl-4 border-l-2">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-20 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
          <HistoryIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No history found</h3>
          <p className="text-muted-foreground mt-1">Your recent actions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped || {}).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 sticky top-16 bg-background/95 backdrop-blur py-2 z-10">
                {date}
              </h3>
              <div className="space-y-4 pl-4 border-l-2 border-border/60 ml-2">
                {entries.map(entry => (
                  <div key={entry.id} className="relative">
                    <div className="absolute -left-[29px] top-1 bg-background rounded-full p-1 border">
                      <ActionIcon action={entry.action} />
                    </div>
                    <Card className="ml-4 hover:border-primary/30 transition-colors shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                                {entry.action.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm">
                              {entry.action === 'completed' && <span>Completed <strong>{entry.amount}</strong> lectures in </span>}
                              {entry.action === 'added_lectures' && <span>Added <strong>{entry.amount}</strong> lectures to </span>}
                              {entry.action === 'created' && <span>Created chapter </span>}
                              {entry.action === 'deleted' && <span>Deleted chapter </span>}
                              {entry.action === 'updated' && <span>Updated chapter </span>}
                              <span className="font-semibold">{entry.chapterName}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.className} • {entry.subjectName}
                            </p>
                          </div>
                          
                          {entry.previousValue != null && entry.newValue != null && (
                            <div className="flex items-center gap-2 text-sm bg-muted/40 px-3 py-1.5 rounded-md">
                              <span className="text-muted-foreground line-through">{entry.previousValue}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium text-foreground">{entry.newValue}</span>
                            </div>
                          )}
                        </div>
                        {entry.note && (
                          <div className="mt-3 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md border border-dashed">
                            "{entry.note}"
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
