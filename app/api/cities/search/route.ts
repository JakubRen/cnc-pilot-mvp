import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const countryCode = searchParams.get('countryCode')

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.append('q', query)
    url.searchParams.append('format', 'json')
    url.searchParams.append('addressdetails', '1')
    url.searchParams.append('limit', '15')

    if (countryCode) {
      url.searchParams.append('countrycodes', countryCode)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CNC-Pilot-MVP/1.0',
      },
    })

    if (!response.ok) {
      throw new Error('Nominatim API request failed')
    }

    const data = await response.json()

    logger.debug('Cities search query', { query, resultCount: data.length })
    if (data.length > 0) {
      logger.debug('First city result', { firstResult: JSON.stringify(data[0]).substring(0, 300) })
    }

    // Filter and format results
    const cities = data
      .filter((item: any) => {
        // Accept places (cities, towns, villages)
        if (item.class === 'place') return true

        // Accept administrative boundaries that are cities
        if (item.class === 'boundary' && item.type === 'administrative') {
          return true // Accept all administrative boundaries
        }

        return false
      })
      .map((item: any) => {
        // Try to get the most specific city name
        const name =
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.address?.municipality ||
          item.address?.administrative || // For administrative boundaries
          item.name

        return {
          name,
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
        }
      })
      .filter((city: any) => city.name) // Remove entries without name
      // Remove duplicates based on name
      .filter(
        (city: any, index: number, self: any[]) =>
          index === self.findIndex((c) => c.name.toLowerCase() === city.name.toLowerCase())
      )
      .slice(0, 10) // Limit to 10 results

    return NextResponse.json(cities)
  } catch (error) {
    logger.error('Error fetching cities', { error })
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
