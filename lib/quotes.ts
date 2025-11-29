export interface Quote {
  id: string
  text: {
    pl: string
    en: string
  }
  author: string
  role?: string
}

export const techQuotes: Quote[] = [
  {
    id: 'dragan-1',
    text: {
      pl: 'Fizyka kwantowa mówi nam, że rzeczywistość jest znacznie dziwniejsza, niż jesteśmy w stanie sobie wyobrazić.',
      en: 'Quantum physics tells us that reality is far stranger than we can imagine.'
    },
    author: 'Andrzej Dragan',
    role: 'Fizyk Kwantowy / Fotograf'
  },
  {
    id: 'feynman-1',
    text: {
      pl: 'Nie rozumiem tego, czego nie potrafię stworzyć.',
      en: 'What I cannot create, I do not understand.'
    },
    author: 'Richard Feynman',
    role: 'Noblista z Fizyki'
  },
  {
    id: 'hassabis-1',
    text: {
      pl: 'Sztuczna inteligencja będzie najważniejszym wynalazkiem ludzkości. Być może ostatnim.',
      en: 'Artificial intelligence will be the most important invention of humanity. Perhaps the last.'
    },
    author: 'Demis Hassabis',
    role: 'CEO Google DeepMind'
  },
  {
    id: 'musk-1',
    text: {
      pl: 'Chciałbym umrzeć na Marsie. Tylko nie przy uderzeniu.',
      en: 'I would like to die on Mars. Just not on impact.'
    },
    author: 'Elon Musk',
    role: 'CEO SpaceX / Tesla'
  },
  {
    id: 'jobs-1',
    text: {
      pl: 'Ludzie, którzy są wystarczająco szaleni, by myśleć, że mogą zmienić świat, są tymi, którzy to robią.',
      en: 'The people who are crazy enough to think they can change the world are the ones who do.'
    },
    author: 'Steve Jobs',
    role: 'Współzałożyciel Apple'
  },
  {
    id: 'feynman-2',
    text: {
      pl: 'Natura nie może być oszukana.',
      en: 'Nature cannot be fooled.'
    },
    author: 'Richard Feynman',
    role: 'Noblista z Fizyki'
  },
  {
    id: 'dragan-2',
    text: {
      pl: 'Nie bój się ciemności. Bój się tego, że przestaniesz jej szukać.',
      en: "Don't be afraid of the dark. Be afraid that you will stop looking for it."
    },
    author: 'Andrzej Dragan',
    role: 'Fizyk Kwantowy'
  },
  {
    id: 'hassabis-2',
    text: {
      pl: 'Zrozumienie inteligencji to klucz do zrozumienia wszechświata.',
      en: 'Understanding intelligence is the key to understanding the universe.'
    },
    author: 'Demis Hassabis',
    role: 'CEO Google DeepMind'
  },
  {
    id: 'musk-2',
    text: {
      pl: 'Inżynieria jest najbliższą rzeczą do magii, jaka istnieje na świecie.',
      en: 'Engineering is the closest thing to magic that exists in the world.'
    },
    author: 'Elon Musk',
    role: 'CEO SpaceX'
  },
  {
    id: 'jobs-2',
    text: {
      pl: 'Design to nie tylko to, jak coś wygląda i jak się czuje. Design to to, jak coś działa.',
      en: 'Design is not just what it looks like and feels like. Design is how it works.'
    },
    author: 'Steve Jobs',
    role: 'Współzałożyciel Apple'
  }
]

export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * techQuotes.length)
  return techQuotes[randomIndex]
}
