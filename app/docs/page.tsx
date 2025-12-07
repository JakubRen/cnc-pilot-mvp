import Content from './content.mdx'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal Wiedzy CNC-Pilot',
  description: 'Kompleksowa dokumentacja systemu CNC-Pilot',
}

export default function DocsPage() {
  return <Content />
}
