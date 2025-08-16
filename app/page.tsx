"use client"

import { useState, useEffect } from "react"
import { Play, Search, Star, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchPopularMovies, searchContent, getStreamingUrl, type Movie, STREAMING_PROVIDERS } from "@/lib/movie-api"

export default function HomePage() {
  const [content, setContent] = useState<Movie[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Movie | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("autoembed")
  const [streamingUrl, setStreamingUrl] = useState("")
  const [urlLoading, setUrlLoading] = useState(false)
  const [recentlyWatched, setRecentlyWatched] = useState<Movie[]>([])
  const [editMode, setEditMode] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)

  // Load popular content on mount
  useEffect(() => {
    const loadContent = async () => {
      console.log("[v0] Loading popular content...")
      try {
        const movies = await fetchPopularMovies()
        setContent(movies)
        console.log("[v0] Loaded content:", movies.length, "items")
      } catch (error) {
        console.error("[v0] Error loading content:", error)
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  // Load recently watched from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentlyWatched")
    if (saved) {
      setRecentlyWatched(JSON.parse(saved))
    }
  }, [])

  // Handle search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await searchContent(searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error("[v0] Search error:", error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Generate streaming URL when content or provider changes
  useEffect(() => {
    if (!selectedContent) return

    const generateUrl = async () => {
      setUrlLoading(true)
      try {
        const url = await getStreamingUrl(
          selectedContent.id,
          selectedProvider,
          selectedContent.type,
          selectedSeason,
          selectedEpisode,
        )
        setStreamingUrl(url)
        console.log("[v0] Generated streaming URL:", url)
      } catch (error) {
        console.error("[v0] Error generating streaming URL:", error)
        setStreamingUrl("")
      } finally {
        setUrlLoading(false)
      }
    }

    generateUrl()
  }, [selectedContent, selectedProvider, selectedSeason, selectedEpisode])

  const getSafeRating = (rating: any): string => {
    if (!rating || rating === "N/A") return "0.0"
    const numRating = Number.parseFloat(rating.toString())
    return isNaN(numRating) ? "0.0" : numRating.toFixed(1)
  }

  const getSafePosterUrl = (poster: any): string => {
    if (!poster || poster === "N/A") {
      return `/placeholder.svg?height=400&width=300&text=No+Poster`
    }
    return poster
  }

  const handleContentClick = (item: Movie) => {
    setSelectedContent(item)
    setSelectedSeason(1)
    setSelectedEpisode(1)

    // Add to recently watched
    const updated = [item, ...recentlyWatched.filter((w) => w.id !== item.id)].slice(0, 10)
    setRecentlyWatched(updated)
    localStorage.setItem("recentlyWatched", JSON.stringify(updated))
  }

  const handleBackClick = () => {
    setSelectedContent(null)
    setStreamingUrl("")
  }

  const removeFromRecentlyWatched = (id: string) => {
    const updated = recentlyWatched.filter((item) => item.id !== id)
    setRecentlyWatched(updated)
    localStorage.setItem("recentlyWatched", JSON.stringify(updated))
  }

  const displayContent = searchQuery.trim() ? searchResults : content

  // Full-page video player view
  if (selectedContent) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header with back button */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-yellow-400">bi6streamz</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="bg-gray-900 rounded-lg overflow-hidden border border-yellow-400/20">
            {/* Provider selector */}
            <div className="p-4 border-b border-yellow-400/20">
              <div className="flex items-center gap-4">
                <span className="text-yellow-400 font-medium">Select Provider:</span>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-64 bg-black border-yellow-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-yellow-400/30">
                    {STREAMING_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id} className="text-white hover:bg-yellow-400/10">
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Season/Episode selectors for TV shows */}
                {selectedContent.type === "series" && (
                  <>
                    <Select
                      value={selectedSeason.toString()}
                      onValueChange={(value) => setSelectedSeason(Number.parseInt(value))}
                    >
                      <SelectTrigger className="w-32 bg-black border-yellow-400/30 text-white">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-yellow-400/30">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((season) => (
                          <SelectItem
                            key={season}
                            value={season.toString()}
                            className="text-white hover:bg-yellow-400/10"
                          >
                            Season {season}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedEpisode.toString()}
                      onValueChange={(value) => setSelectedEpisode(Number.parseInt(value))}
                    >
                      <SelectTrigger className="w-32 bg-black border-yellow-400/30 text-white">
                        <SelectValue placeholder="Episode" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-yellow-400/30">
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((episode) => (
                          <SelectItem
                            key={episode}
                            value={episode.toString()}
                            className="text-white hover:bg-yellow-400/10"
                          >
                            Episode {episode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {/* Video player */}
            <div className="relative h-[50vh] bg-black flex items-center justify-center">
              {urlLoading ? (
                <div className="text-yellow-400">Loading player...</div>
              ) : streamingUrl ? (
                <iframe
                  src={streamingUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <div className="text-gray-400">Unable to load video</div>
              )}
            </div>
          </div>

          {/* Movie details */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedContent.title}</h2>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-yellow-400">{selectedContent.year}</span>
                <span className="text-yellow-400">•</span>
                <span className="text-yellow-400 uppercase">{selectedContent.type}</span>
                <span className="text-yellow-400">•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-yellow-400">{getSafeRating(selectedContent.rating)}</span>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">{selectedContent.plot}</p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src={getSafePosterUrl(selectedContent.poster) || "/placeholder.svg"}
                alt={selectedContent.title}
                className="w-64 h-96 object-cover rounded-lg border border-yellow-400/20"
                onError={(e) => {
                  e.currentTarget.src = `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(selectedContent.title)}`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main page view
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-yellow-400/20 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold text-yellow-400">bi6streamz</h1>
            </div>

            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400 w-4 h-4" />
                <Input
                  placeholder="Search for movies, series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setEditMode(!editMode)}
              className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
            >
              {editMode ? "Exit Mode" : "Edit Mode"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Recently Watched Section */}
        {recentlyWatched.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">Keep Watching</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentlyWatched.map((item) => (
                <div key={item.id} className="relative group">
                  <div
                    className="bg-gray-900 rounded-lg overflow-hidden border border-yellow-400/20 hover:border-yellow-400/40 transition-all cursor-pointer"
                    onClick={() => !editMode && handleContentClick(item)}
                  >
                    <div className="relative">
                      <img
                        src={getSafePosterUrl(item.poster) || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `/placeholder.svg?height=200&width=150&text=${encodeURIComponent(item.title)}`
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span className="bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold uppercase">
                          {item.type === "series" ? "TV" : "Movie"}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-yellow-400 text-sm">{getSafeRating(item.rating)}</span>
                      </div>
                    </div>
                  </div>

                  {editMode && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-red-600 hover:bg-red-700"
                      onClick={() => removeFromRecentlyWatched(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}

                  <div className="mt-2">
                    <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
                    <p className="text-gray-400 text-xs">{item.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular Content Section */}
        <section>
          <h2 className="text-2xl font-bold text-yellow-400 mb-6">
            {searchQuery.trim() ? `Search Results for "${searchQuery}"` : "Popular Content"}
          </h2>

          {loading || searchLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-yellow-400">Loading...</div>
            </div>
          ) : displayContent.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-400">No content available.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {displayContent.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900 rounded-lg overflow-hidden border border-yellow-400/20 hover:border-yellow-400/40 transition-all cursor-pointer group"
                  onClick={() => handleContentClick(item)}
                >
                  <div className="relative">
                    <img
                      src={getSafePosterUrl(item.poster) || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = `/placeholder.svg?height=300&width=200&text=${encodeURIComponent(item.title)}`
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold uppercase">
                        {item.type === "series" ? "TV" : "Movie"}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-yellow-400 text-sm">{getSafeRating(item.rating)}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm mb-1 truncate">{item.title}</h3>
                    <p className="text-gray-400 text-xs">{item.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
