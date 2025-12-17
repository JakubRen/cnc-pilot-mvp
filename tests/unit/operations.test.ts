/**
 * Unit Tests for Operations Helper Functions
 *
 * Tests the calculation and formatting utilities for operations
 */

import { describe, it, expect } from 'vitest'
import {
  calculateOperationCost,
  formatDuration,
  formatCost
} from '../../types/operations'

describe('calculateOperationCost', () => {
  it('should calculate costs correctly for simple case', () => {
    const result = calculateOperationCost(
      30,   // setup: 30 min
      5,    // run: 5 min/unit
      10,   // quantity: 10 units
      180   // rate: 180 PLN/h
    )

    // Setup: 30/60 * 180 = 90 PLN
    // Run: 5 * 10 / 60 * 180 = 150 PLN
    // Total: 240 PLN
    // Time: 30 + 50 = 80 min

    expect(result.setupCost).toBe(90)
    expect(result.runCost).toBe(150)
    expect(result.totalCost).toBe(240)
    expect(result.totalTimeMinutes).toBe(80)
  })

  it('should handle zero setup time', () => {
    const result = calculateOperationCost(
      0,    // no setup
      10,   // run: 10 min/unit
      5,    // quantity: 5 units
      200   // rate: 200 PLN/h
    )

    // Setup: 0
    // Run: 10 * 5 / 60 * 200 = 166.67 PLN
    // Total: 166.67 PLN

    expect(result.setupCost).toBe(0)
    expect(result.runCost).toBe(166.67)
    expect(result.totalCost).toBe(166.67)
    expect(result.totalTimeMinutes).toBe(50)
  })

  it('should handle zero run time', () => {
    const result = calculateOperationCost(
      45,   // setup: 45 min
      0,    // no run time
      100,  // quantity doesn't matter
      150   // rate: 150 PLN/h
    )

    // Setup: 45/60 * 150 = 112.50 PLN
    // Run: 0
    // Total: 112.50 PLN

    expect(result.setupCost).toBe(112.5)
    expect(result.runCost).toBe(0)
    expect(result.totalCost).toBe(112.5)
    expect(result.totalTimeMinutes).toBe(45)
  })

  it('should handle large quantities', () => {
    const result = calculateOperationCost(
      20,   // setup: 20 min
      2,    // run: 2 min/unit
      1000, // quantity: 1000 units
      180   // rate: 180 PLN/h
    )

    // Setup: 20/60 * 180 = 60 PLN
    // Run: 2 * 1000 / 60 * 180 = 6000 PLN
    // Total: 6060 PLN
    // Time: 20 + 2000 = 2020 min

    expect(result.setupCost).toBe(60)
    expect(result.runCost).toBe(6000)
    expect(result.totalCost).toBe(6060)
    expect(result.totalTimeMinutes).toBe(2020)
  })

  it('should round to 2 decimal places', () => {
    const result = calculateOperationCost(
      17,   // setup: 17 min
      3.33, // run: 3.33 min/unit
      7,    // quantity: 7 units
      175   // rate: 175 PLN/h
    )

    // Actual calculations:
    // Setup: 17/60 * 175 = 49.58333... → 49.58 PLN
    // Run: 3.33 * 7 / 60 * 175 = 67.9916... → 67.99 PLN
    // Total: 117.57333... → 117.57 PLN
    expect(result.setupCost).toBeCloseTo(49.58, 2)
    expect(result.runCost).toBeCloseTo(67.99, 2)
    expect(result.totalCost).toBeCloseTo(117.57, 2)
  })

  it('should handle fractional times', () => {
    const result = calculateOperationCost(
      12.5,  // setup: 12.5 min
      0.75,  // run: 0.75 min/unit
      50,    // quantity: 50 units
      200    // rate: 200 PLN/h
    )

    expect(result.setupCost).toBe(41.67)
    expect(result.runCost).toBe(125)
    expect(result.totalCost).toBe(166.67)
    expect(result.totalTimeMinutes).toBe(50)
  })
})

describe('formatDuration', () => {
  it('should format minutes correctly', () => {
    expect(formatDuration(5)).toBe('5 min')
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(59)).toBe('59 min')
  })

  it('should format hours correctly', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(180)).toBe('3h')
  })

  it('should format hours and minutes', () => {
    expect(formatDuration(65)).toBe('1h 5min')
    expect(formatDuration(90)).toBe('1h 30min')
    expect(formatDuration(125)).toBe('2h 5min')
  })

  it('should handle large durations', () => {
    expect(formatDuration(600)).toBe('10h')
    expect(formatDuration(605)).toBe('10h 5min')
    expect(formatDuration(1440)).toBe('24h') // 1 day
  })

  it('should round minutes', () => {
    expect(formatDuration(65.7)).toBe('1h 6min')
    expect(formatDuration(90.3)).toBe('1h 30min')
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0 min')
  })

  it('should handle fractional minutes under 1 hour', () => {
    expect(formatDuration(0.5)).toBe('1 min')
    expect(formatDuration(30.8)).toBe('31 min')
  })
})

describe('formatCost', () => {
  it('should format whole numbers', () => {
    expect(formatCost(100)).toBe('100.00 PLN')
    expect(formatCost(1000)).toBe('1000.00 PLN')
  })

  it('should format decimals', () => {
    expect(formatCost(123.45)).toBe('123.45 PLN')
    expect(formatCost(99.99)).toBe('99.99 PLN')
  })

  it('should always show 2 decimal places', () => {
    expect(formatCost(100.5)).toBe('100.50 PLN')
    expect(formatCost(50.1)).toBe('50.10 PLN')
  })

  it('should handle zero', () => {
    expect(formatCost(0)).toBe('0.00 PLN')
  })

  it('should handle large amounts', () => {
    expect(formatCost(999999.99)).toBe('999999.99 PLN')
  })

  it('should round to 2 decimal places', () => {
    expect(formatCost(123.456)).toBe('123.46 PLN')
    expect(formatCost(99.994)).toBe('99.99 PLN')
    expect(formatCost(99.995)).toBe('100.00 PLN')
  })
})

describe('Real-world scenarios', () => {
  it('should calculate turning operation correctly', () => {
    // Real scenario: Turning a shaft
    // Setup: 15 min (chuck setup, tool selection)
    // Run: 4 min per unit
    // Quantity: 50 units
    // Rate: 180 PLN/h

    const result = calculateOperationCost(15, 4, 50, 180)

    expect(result.setupCost).toBe(45) // 15/60 * 180
    expect(result.runCost).toBe(600)  // 4 * 50 / 60 * 180
    expect(result.totalCost).toBe(645)
    expect(formatDuration(result.totalTimeMinutes)).toBe('3h 35min')
    expect(formatCost(result.totalCost)).toBe('645.00 PLN')
  })

  it('should calculate milling operation correctly', () => {
    // Real scenario: Milling a flange
    // Setup: 30 min (fixture setup, tool check)
    // Run: 8 min per unit
    // Quantity: 25 units
    // Rate: 200 PLN/h

    const result = calculateOperationCost(30, 8, 25, 200)

    expect(result.setupCost).toBe(100)    // 30/60 * 200
    expect(result.runCost).toBe(666.67)   // 8 * 25 / 60 * 200
    expect(result.totalCost).toBe(766.67)
    // Total time: 30 + (8 * 25) = 30 + 200 = 230 min = 3h 50min
    expect(formatDuration(result.totalTimeMinutes)).toBe('3h 50min')
    expect(formatCost(result.totalCost)).toBe('766.67 PLN')
  })

  it('should calculate drilling operation correctly', () => {
    // Real scenario: Drilling holes
    // Setup: 5 min (quick setup)
    // Run: 1.5 min per unit
    // Quantity: 100 units
    // Rate: 150 PLN/h

    const result = calculateOperationCost(5, 1.5, 100, 150)

    expect(result.setupCost).toBe(12.5)   // 5/60 * 150
    expect(result.runCost).toBe(375)      // 1.5 * 100 / 60 * 150
    expect(result.totalCost).toBe(387.5)
    expect(formatDuration(result.totalTimeMinutes)).toBe('2h 35min')
    expect(formatCost(result.totalCost)).toBe('387.50 PLN')
  })

  it('should calculate multi-operation total', () => {
    // Real scenario: Part with 3 operations
    const op1 = calculateOperationCost(20, 6, 50, 180)  // Turning: 60 + 900 = 960
    const op2 = calculateOperationCost(15, 4, 50, 180)  // Milling: 45 + 600 = 645
    const op3 = calculateOperationCost(5, 2, 50, 150)   // Drilling: 12.5 + 250 = 262.5

    const totalCost = op1.totalCost + op2.totalCost + op3.totalCost
    const totalTime = op1.totalTimeMinutes + op2.totalTimeMinutes + op3.totalTimeMinutes

    // Total: 960 + 645 + 262.5 = 1867.5 PLN
    // Time: (20+300) + (15+200) + (5+100) = 640 min = 10h 40min
    expect(totalCost).toBe(1867.5)
    expect(formatCost(totalCost)).toBe('1867.50 PLN')
    expect(formatDuration(totalTime)).toBe('10h 40min')
  })

  it('should show economy of scale (setup vs quantity)', () => {
    // Same operation, different quantities
    const small = calculateOperationCost(30, 5, 10, 180)   // Small batch
    const large = calculateOperationCost(30, 5, 100, 180)  // Large batch

    // Setup cost is same
    expect(small.setupCost).toBe(large.setupCost)

    // But cost per unit decreases with quantity
    const costPerUnitSmall = small.totalCost / 10
    const costPerUnitLarge = large.totalCost / 100

    expect(costPerUnitSmall).toBeGreaterThan(costPerUnitLarge)

    // Small: 90 + 150 = 240 / 10 = 24 PLN/unit
    // Large: 90 + 1500 = 1590 / 100 = 15.9 PLN/unit
    expect(costPerUnitSmall).toBe(24)
    expect(costPerUnitLarge).toBe(15.9)
  })
})
