'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface City {
  name: string
  display_name: string
  lat: string
  lon: string
}

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  country?: string
  error?: string
  placeholder?: string
}

export default function CityAutocomplete({
  value,
  onChange,
  country = 'Polska',
  error,
  placeholder = 'Wpisz nazwę miasta...',
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  // Fetch cities from our API route (proxy to Nominatim)
  const fetchCities = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setCities([])
        return
      }

      setIsLoading(true)

      try {
        // Map country names to country codes for better results
        const countryCode = getCountryCode(country)

        const url = new URL('/api/cities/search', window.location.origin)
        url.searchParams.append('q', query)

        if (countryCode) {
          url.searchParams.append('countryCode', countryCode)
        }

        const response = await fetch(url.toString())

        if (!response.ok) {
          throw new Error('Failed to fetch cities')
        }

        const data = await response.json()
        setCities(data)
      } catch (error) {
        logger.error('Error fetching cities', { error })
        setCities([])
      } finally {
        setIsLoading(false)
      }
    },
    [country]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    onChange(newValue)
    setIsOpen(true)

    // Debounce API call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      fetchCities(newValue)
    }, 300)
  }

  const handleSelect = (cityName: string) => {
    setSearchTerm(cityName)
    onChange(cityName)
    setIsOpen(false)
    setCities([])
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => {
          setIsOpen(true)
          if (searchTerm && cities.length === 0) {
            fetchCities(searchTerm)
          }
        }}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
        } text-slate-900 dark:text-white focus:outline-none`}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              <span className="inline-block animate-spin mr-2">⏳</span>
              Wyszukiwanie...
            </div>
          )}

          {!isLoading && cities.length > 0 && (
            <>
              {cities.map((city, index) => (
                <button
                  key={`${city.name}-${index}`}
                  type="button"
                  onClick={() => handleSelect(city.name)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <div className="text-slate-900 dark:text-white font-medium">
                    {city.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {city.display_name}
                  </div>
                </button>
              ))}
            </>
          )}

          {!isLoading && searchTerm.length >= 2 && cities.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Nie znaleziono miast. Możesz wpisać własną nazwę.
            </div>
          )}

          {!isLoading && searchTerm.length < 2 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Wpisz przynajmniej 2 znaki aby wyszukać miasta
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to map country names to ISO country codes
function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    Polska: 'pl',
    Niemcy: 'de',
    Francja: 'fr',
    Włochy: 'it',
    Hiszpania: 'es',
    'Wielka Brytania': 'gb',
    Czechy: 'cz',
    Słowacja: 'sk',
    Austria: 'at',
    Węgry: 'hu',
    Rumunia: 'ro',
    Bułgaria: 'bg',
    Ukraina: 'ua',
    Białoruś: 'by',
    Litwa: 'lt',
    Łotwa: 'lv',
    Estonia: 'ee',
    Norwegia: 'no',
    Szwecja: 'se',
    Finlandia: 'fi',
    Dania: 'dk',
    Holandia: 'nl',
    Belgia: 'be',
    Luksemburg: 'lu',
    Szwajcaria: 'ch',
    Portugalia: 'pt',
    Grecja: 'gr',
    Chorwacja: 'hr',
    Słowenia: 'si',
    Serbia: 'rs',
    'Stany Zjednoczone': 'us',
    Kanada: 'ca',
    Meksyk: 'mx',
    Brazylia: 'br',
    Argentyna: 'ar',
    Chiny: 'cn',
    Japonia: 'jp',
    Australia: 'au',
  }

  return countryMap[country] || ''
}
