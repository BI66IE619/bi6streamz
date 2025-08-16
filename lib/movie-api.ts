export interface Movie {
  id: string
  title: string
  year: string
  type: "movie" | "series"
  poster: string
  rating: number
  plot?: string
}

export interface StreamingProvider {
  id: string
  name: string
  category: "best" | "alternative"
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: "autoembed", name: "AutoEmbed - Ads", category: "best" },
  { id: "autoembed2", name: "AutoEmbed 2 - Ads", category: "alternative" },
]

const OMDB_API_KEY = "f5aab909"
const OMDB_BASE_URL = "https://www.omdbapi.com"

function getProxiedPosterUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl === "N/A") {
    return `/placeholder.svg?height=400&width=300&text=No+Poster`
  }

  // Use a CORS proxy to bypass Amazon's restrictions
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`
}

function parseRating(imdbRating: string): number {
  const rating = Number.parseFloat(imdbRating)
  return isNaN(rating) ? 0 : rating
}

export async function fetchPopularMovies(): Promise<Movie[]> {
  const movieTitles = [
    "Avengers: Endgame",
    "Spider-Man: No Way Home",
    "The Batman",
    "Top Gun: Maverick",
    "Black Panther",
    "Dune",
    "No Time to Die",
    "Fast X",
    "John Wick: Chapter 4",
    "Avatar: The Way of Water",
  ]

  const tvTitles = ["Stranger Things", "Breaking Bad", "The Witcher", "House of the Dragon", "Wednesday", "Squid Game"]

  const allTitles = [...movieTitles, ...tvTitles]
  const movies: Movie[] = []

  console.log("[v0] Fetching movies from OMDb API...")

  for (const title of allTitles) {
    try {
      const response = await fetch(`${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}`)
      const data = await response.json()

      if (data.Response === "True") {
        const posterUrl = getProxiedPosterUrl(data.Poster)
        console.log(`[v0] Poster URL for ${title} : ${posterUrl}`)

        movies.push({
          id: data.imdbID,
          title: data.Title,
          year: data.Year,
          type: data.Type === "series" ? "series" : "movie",
          poster: posterUrl,
          rating: parseRating(data.imdbRating),
          plot: data.Plot,
        })
      }
    } catch (error) {
      console.error(`[v0] Error fetching ${title}:`, error)
    }
  }

  console.log(`[v0] Fetched ${movies.length} movies/shows`)
  return movies
}

export async function searchContent(query: string): Promise<Movie[]> {
  if (!query.trim()) return []

  try {
    const response = await fetch(`${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`)
    const data = await response.json()

    if (data.Response === "True" && data.Search) {
      return data.Search.slice(0, 10).map((item: any) => ({
        id: item.imdbID,
        title: item.Title,
        year: item.Year,
        type: item.Type === "series" ? "series" : "movie",
        poster: getProxiedPosterUrl(item.Poster),
        rating: 0,
        plot: "",
      }))
    }
  } catch (error) {
    console.error("[v0] Search error:", error)
  }

  return []
}

export function getStreamingUrl(
  imdbId: string,
  provider: string,
  type: "movie" | "series",
  season = 1,
  episode = 1,
): string {
  const baseUrl = "https://player.autoembed.cc/embed"

  if (type === "series") {
    return `${baseUrl}/tv/${imdbId}/${season}/${episode}`
  } else {
    return `${baseUrl}/movie/${imdbId}`
  }
}
