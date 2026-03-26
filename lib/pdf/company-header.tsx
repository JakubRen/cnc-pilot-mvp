import React from 'react'
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { VIOLET } from './styles'
import type { CompanyBranding } from './types'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#374151',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  line: {
    height: 2,
    backgroundColor: VIOLET,
    marginTop: 8,
    marginBottom: 16,
  },
  infoLine: {
    marginBottom: 1,
  },
})

interface CompanyHeaderProps {
  company: CompanyBranding
}

export default function CompanyHeader({ company }: CompanyHeaderProps) {
  return (
    <View>
      <View style={styles.container}>
        {/* Left: Logo */}
        {company.logo_url ? (
          <Image src={company.logo_url} style={styles.logo} />
        ) : (
          <View />
        )}

        {/* Right: Company info */}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          {company.address && <Text style={styles.infoLine}>{company.address}</Text>}
          {company.nip && <Text style={styles.infoLine}>NIP: {company.nip}</Text>}
          {company.phone && <Text style={styles.infoLine}>Tel: {company.phone}</Text>}
          {company.email && <Text style={styles.infoLine}>{company.email}</Text>}
          {company.website && <Text style={styles.infoLine}>{company.website}</Text>}
        </View>
      </View>
      <View style={styles.line} />
    </View>
  )
}
