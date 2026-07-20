import { useState, useMemo } from "react"
import { useRoute } from "wouter"
import { 
  useGetChaptersBySubject, 
  useGetClasses, 
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useCompleteLectures,
  useAddLectures,
  getGetChaptersBySubjectQueryKey,
  getGetClassesQueryKey,
  getGetDashboardQueryKey,
  getGetStatisticsQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogClose 
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

import { Plus, Check, MoreVertical, Edit2, Trash2, BookOpen, Clock, LayoutGrid, Search, SortAsc } from "lucide-react"
import { cn } from "@/lib/utils"

// Form Schemas
const chapterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  totalLectures: z.coerce.number().min(1, "Must have at least 1 lecture")
})

const editChapterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  totalLectures: z.coerce.number().min(1, "Must have at least 1 lecture"),
  completedLectures: z.coerce.number().min(0)
}).refine(data => data.completedLectures <= data.totalLectures, {
  message: "Completed cannot exceed total",
  path: ["totalLectures"]
})

const actionSchema = z.object({
  amount: z.coerce.number().min(1, "Must be at least 1"),
  note: z.string().optional()
})

export default function SubjectChapters() {
  const [, params] = useRoute("/class/:classId/subject/:subjectId")
  const classId = parseInt(params?.classId || "0", 10)
  const subjectId = parseInt(params?.subjectId || "0", 10)
  
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("recent")
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: classes, isLoading: classesLoading } = useGetClasses()
  const { data: chapters, isLoading: chaptersLoading } = useGetChaptersBySubject(subjectId, {
    query: { enabled: !!subjectId, queryKey: getGetChaptersBySubjectQueryKey(subjectId) }
  })

  // Determine current context names
  const currentClass = classes?.find(c => c.id === classId)
  const currentSubject = currentClass?.subjects.find(s => s.id === subjectId)

  // Mutations
  const createChapter = useCreateChapter()
  const updateChapter = useUpdateChapter()
  const deleteChapter = useDeleteChapter()
  const completeLectures = useCompleteLectures()
  const addLectures = useAddLectures()

  // Invalidations after successful mutation
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetChaptersBySubjectQueryKey(subjectId) })
    queryClient.invalidateQueries({ queryKey: getGetClassesQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetStatisticsQueryKey() })
  }

  // Client-side filtering and sorting
  const filteredAndSortedChapters = useMemo(() => {
    if (!chapters) return []
    
    let result = [...chapters]
    
    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q))
    }
    
    // Filter
    if (filter === "pending") {
      result = result.filter(c => c.remainingLectures > 0)
    } else if (filter === "completed") {
      result = result.filter(c => c.remainingLectures === 0)
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "alphabetical": return a.name.localeCompare(b.name)
        case "remaining_high": return b.remainingLectures - a.remainingLectures
        case "remaining_low": return a.remainingLectures - b.remainingLectures
        case "created": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "recent":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })
    
    return result
  }, [chapters, search, filter, sort])

  // --- Modals State ---
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [completeId, setCompleteId] = useState<number | null>(null)
  const [addId, setAddId] = useState<number | null>(null)

  // --- Forms ---
  const createForm = useForm<z.infer<typeof chapterSchema>>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { name: "", totalLectures: 1 }
  })

  const editForm = useForm<z.infer<typeof editChapterSchema>>({
    resolver: zodResolver(editChapterSchema)
  })

  const actionForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: { amount: 1, note: "" }
  })

  // --- Handlers ---
  const onCreateSubmit = (values: z.infer<typeof chapterSchema>) => {
    createChapter.mutate({ subjectId, data: values }, {
      onSuccess: () => {
        toast({ title: "Chapter created" })
        setCreateOpen(false)
        createForm.reset()
        invalidateAll()
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    })
  }

  const openEdit = (chapter: any) => {
    editForm.reset({ 
      name: chapter.name, 
      totalLectures: chapter.totalLectures,
      completedLectures: chapter.completedLectures 
    })
    setEditId(chapter.id)
  }

  const onEditSubmit = (values: z.infer<typeof editChapterSchema>) => {
    if (!editId) return
    updateChapter.mutate({ id: editId, data: { name: values.name, totalLectures: values.totalLectures } }, {
      onSuccess: () => {
        toast({ title: "Chapter updated" })
        setEditId(null)
        invalidateAll()
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    })
  }

  const onDeleteConfirm = () => {
    if (!deleteId) return
    deleteChapter.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "Chapter deleted" })
        setDeleteId(null)
        invalidateAll()
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    })
  }

  const onCompleteSubmit = (values: z.infer<typeof actionSchema>) => {
    if (!completeId) return
    completeLectures.mutate({ id: completeId, data: values }, {
      onSuccess: () => {
        toast({ title: "Lectures completed!" })
        setCompleteId(null)
        actionForm.reset()
        invalidateAll()
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    })
  }

  const onAddSubmit = (values: z.infer<typeof actionSchema>) => {
    if (!addId) return
    addLectures.mutate({ id: addId, data: values }, {
      onSuccess: () => {
        toast({ title: "Lectures added to total" })
        setAddId(null)
        actionForm.reset()
        invalidateAll()
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    })
  }

  // Find targeted chapters for modals
  const targetCompleteChapter = chapters?.find(c => c.id === completeId)
  const targetAddChapter = chapters?.find(c => c.id === addId)

  // Maximum allowed to complete
  const maxComplete = targetCompleteChapter ? targetCompleteChapter.remainingLectures : 0

  if (classesLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="flex gap-4 mb-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-32" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    )
  }

  if (!subjectId || !currentClass || !currentSubject) {
    return <div className="p-8 text-center text-muted-foreground">Subject not found.</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 font-medium tracking-wide">
            <LayoutGrid className="h-4 w-4" /> {currentClass.name}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{currentSubject.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {currentSubject.totalChapters} chapters</span>
            <span className="flex items-center gap-1.5 text-primary"><Clock className="h-4 w-4" /> {currentSubject.remainingLectures} pending</span>
          </div>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Chapter</DialogTitle>
              <DialogDescription>Create a new chapter to track its lectures.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapter Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rotational Mechanics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="totalLectures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Lectures</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>The total number of lectures for this chapter.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createChapter.isPending}>
                    {createChapter.isPending ? "Creating..." : "Create Chapter"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border rounded-lg p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chapters..." 
            className="pl-9 bg-transparent border-0 shadow-none focus-visible:ring-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-px sm:h-auto sm:w-px bg-border my-1 sm:my-0 mx-2" />
        <div className="flex gap-2 shrink-0">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[130px] border-0 bg-transparent">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chapters</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-6 w-px bg-border self-center" />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px] border-0 bg-transparent">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="created">Recently Created</SelectItem>
              <SelectItem value="remaining_high">Most Remaining</SelectItem>
              <SelectItem value="remaining_low">Least Remaining</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chapters Grid */}
      {chaptersLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredAndSortedChapters.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border border-dashed rounded-xl">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No chapters found</h3>
          <p className="text-muted-foreground mt-1">
            {search || filter !== 'all' ? "Try adjusting your filters or search query." : "Add your first chapter to get started."}
          </p>
          {!(search || filter !== 'all') && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Chapter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
          {filteredAndSortedChapters.map((chapter) => {
            const isCompleted = chapter.remainingLectures === 0;
            const percentage = (chapter.completedLectures / chapter.totalLectures) * 100;
            
            return (
              <Card key={chapter.id} className={cn(
                "hover-elevate transition-all flex flex-col h-full relative overflow-hidden",
                isCompleted && "border-green-500/30 bg-green-500/5 dark:bg-green-500/10"
              )}>
                {isCompleted && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="absolute top-4 -right-5 bg-green-500 text-white text-[10px] font-bold py-0.5 px-6 rotate-45 shadow-sm">
                      DONE
                    </div>
                  </div>
                )}
                
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold leading-tight line-clamp-2 pr-6" title={chapter.name}>
                      {chapter.name}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground shrink-0 absolute right-3">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(chapter)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Edit Info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setAddId(chapter.id); actionForm.reset({ amount: 1, note: "" }) }}>
                          <Plus className="h-4 w-4 mr-2" /> Add to Total
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteId(chapter.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 p-2 rounded-md">
                        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-0.5">Completed</div>
                        <div className="font-semibold">{chapter.completedLectures} <span className="text-muted-foreground font-normal text-xs">/ {chapter.totalLectures}</span></div>
                      </div>
                      <div className={cn("p-2 rounded-md", isCompleted ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-primary/10 text-primary")}>
                        <div className="opacity-80 text-xs font-medium uppercase tracking-wider mb-0.5">Pending</div>
                        <div className="font-bold">{chapter.remainingLectures}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Progress</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2 bg-muted/60" 
                        indicatorClassName={isCompleted ? "bg-green-500" : "bg-primary"}
                      />
                    </div>

                    {!isCompleted ? (
                      <Button 
                        className="w-full mt-2" 
                        variant="secondary"
                        onClick={() => {
                          setCompleteId(chapter.id)
                          actionForm.reset({ amount: Math.min(1, chapter.remainingLectures), note: "" })
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Complete Lectures
                      </Button>
                    ) : (
                      <Button className="w-full mt-2" variant="outline" disabled>
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* --- Action Dialogs --- */}

      {/* Edit Chapter */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="totalLectures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Lectures</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormDescription>If you need to change the total duration.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={updateChapter.isPending}>
                  {updateChapter.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Complete Lectures */}
      <Dialog open={!!completeId} onOpenChange={(open) => !open && setCompleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Lectures</DialogTitle>
            <DialogDescription>
              Mark lectures as completed for <strong className="text-foreground">{targetCompleteChapter?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded-md mb-2 flex justify-between text-sm">
            <span>Currently Complete: <strong>{targetCompleteChapter?.completedLectures}</strong></span>
            <span>Remaining: <strong>{targetCompleteChapter?.remainingLectures}</strong></span>
          </div>
          <Form {...actionForm}>
            <form onSubmit={actionForm.handleSubmit(onCompleteSubmit)} className="space-y-4">
              <FormField
                control={actionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lectures to mark as done</FormLabel>
                    <FormControl><Input type="number" min={1} max={maxComplete} {...field} /></FormControl>
                    <FormDescription>Cannot exceed remaining lectures ({maxComplete}).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={actionForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. Part 1-3 from module" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={completeLectures.isPending}>
                  {completeLectures.isPending ? "Saving..." : "Mark Completed"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add to Total Lectures */}
      <Dialog open={!!addId} onOpenChange={(open) => !open && setAddId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lectures to Total</DialogTitle>
            <DialogDescription>
              Increase the total lecture count for <strong className="text-foreground">{targetAddChapter?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded-md mb-2 text-sm">
            Current Total: <strong>{targetAddChapter?.totalLectures}</strong>
          </div>
          <Form {...actionForm}>
            <form onSubmit={actionForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={actionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lectures to add</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormDescription>This increases the total length of the chapter.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={actionForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. Extra problem solving session added" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={addLectures.isPending}>
                  {addLectures.isPending ? "Adding..." : "Add to Total"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete the chapter and all its history entries. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteChapter.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
