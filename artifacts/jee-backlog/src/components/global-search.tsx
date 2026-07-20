import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useQuery } from "@tanstack/react-query"
import type { ChapterWithContext } from "@workspace/api-client-react"

export function GlobalSearch({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [, setLocation] = useLocation()

  // debounce query locally to avoid spamming the API
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = useQuery<ChapterWithContext[]>({
    queryKey: ["search", debouncedQuery],
    enabled: debouncedQuery.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery })
      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  if (mobile) {
    return (
      <>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Search className="h-5 w-5" />
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Search chapters..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{isLoading ? "Searching..." : "No results found."}</CommandEmpty>
            {results && results.length > 0 && (
              <CommandGroup heading="Chapters">
                {results.map((chapter) => (
                  <CommandItem
                    key={chapter.id}
                    value={chapter.name}
                    onSelect={() => {
                      setOpen(false)
                      setLocation(`/class/${chapter.classId}/subject/${chapter.subjectId}`)
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{chapter.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {chapter.className} • {chapter.subjectName} • {chapter.remainingLectures} pending
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-sm text-muted-foreground bg-background hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search chapters..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{isLoading ? "Searching..." : debouncedQuery ? "No results found." : "Type to search..."}</CommandEmpty>
          {results && results.length > 0 && (
            <CommandGroup heading="Chapters">
              {results.map((chapter) => (
                <CommandItem
                  key={chapter.id}
                  value={chapter.name}
                  onSelect={() => {
                    setOpen(false)
                    setLocation(`/class/${chapter.classId}/subject/${chapter.subjectId}`)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{chapter.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {chapter.className} • {chapter.subjectName} • {chapter.remainingLectures} pending
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
