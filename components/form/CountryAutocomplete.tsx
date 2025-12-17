'use client'

import { useState, useRef, useEffect } from 'react'

const COUNTRIES = [
  'Polska',
  'Niemcy',
  'Francja',
  'Włochy',
  'Hiszpania',
  'Wielka Brytania',
  'Czechy',
  'Słowacja',
  'Austria',
  'Węgry',
  'Rumunia',
  'Bułgaria',
  'Ukraina',
  'Białoruś',
  'Litwa',
  'Łotwa',
  'Estonia',
  'Norwegia',
  'Szwecja',
  'Finlandia',
  'Dania',
  'Holandia',
  'Belgia',
  'Luksemburg',
  'Szwajcaria',
  'Portugalia',
  'Grecja',
  'Chorwacja',
  'Słowenia',
  'Serbia',
  'Albania',
  'Macedonia Północna',
  'Irlandia',
  'Islandia',
  'Malta',
  'Cypr',
  'Turcja',
  'Rosja',
  'Stany Zjednoczone',
  'Kanada',
  'Meksyk',
  'Brazylia',
  'Argentyna',
  'Chile',
  'Kolumbia',
  'Peru',
  'Wenezuela',
  'Chiny',
  'Japonia',
  'Korea Południowa',
  'Indie',
  'Tajlandia',
  'Wietnam',
  'Malezja',
  'Singapur',
  'Indonezja',
  'Filipiny',
  'Australia',
  'Nowa Zelandia',
  'Egipt',
  'RPA',
  'Maroko',
  'Tunezja',
  'Algieria',
  'Arabia Saudyjska',
  'Zjednoczone Emiraty Arabskie',
  'Izrael',
  'Iran',
  'Irak',
].sort()

interface CountryAutocompleteProps {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}

export default function CountryAutocomplete({
  value,
  onChange,
  error,
  placeholder = 'Wybierz lub wpisz kraj...',
}: CountryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filter countries based on search term
  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const handleSelect = (country: string) => {
    setSearchTerm(country)
    onChange(country)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    onChange(newValue)
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
        } text-slate-900 dark:text-white focus:outline-none`}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && filteredCountries.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          {filteredCountries.slice(0, 10).map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => handleSelect(country)}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition"
            >
              {country}
            </button>
          ))}
          {filteredCountries.length > 10 && (
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 text-center border-t border-slate-200 dark:border-slate-700">
              Pokaż więcej... (wpisz więcej znaków)
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {isOpen && searchTerm && filteredCountries.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          Nie znaleziono kraju. Możesz wpisać własną nazwę.
        </div>
      )}
    </div>
  )
}
