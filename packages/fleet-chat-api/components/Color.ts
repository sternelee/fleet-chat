/**
 * Fleet Chat Color Component
 *
 * Raycast-compatible Color enum and utilities
 */

/**
 * Color enum matching @raycast/api Color
 */
export enum Color {
  // Standard colors
  Red = '#FF0000',
  Orange = '#FF9500',
  Yellow = '#FFCC00',
  Green = '#00CC00',
  Blue = '#007AFF',
  Purple = '#AF52DE',
  Pink = '#FF2D55',
  Brown = '#A2845E',

  // Text colors
  PrimaryText = '#000000',
  SecondaryText = '#666666',

  // Background colors
  DarkGray = '#8E8E93',
  LightGray = '#E5E5EA',
}

/**
 * Color utilities for creating dynamic colors
 */
export class ColorUtils {
  /**
   * Create a color with RGB values
   */
  static rgb(red: number, green: number, blue: number): string {
    return `rgb(${red}, ${green}, ${blue})`
  }

  /**
   * Create a color with RGBA values (with alpha)
   */
  static rgba(red: number, green: number, blue: number, alpha: number): string {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  /**
   * Create a color from hex with alpha
   */
  static hex(hex: string, alpha: number = 1): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '')

    // Parse RGB values
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)

    return ColorUtils.rgba(r, g, b, alpha)
  }

  /**
   * Lighten a color by a percentage
   */
  static lighten(color: string, percent: number): string {
    // Simple implementation for standard colors
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt)
    const B = Math.min(255, (num & 0x0000ff) + amt)
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }

  /**
   * Darken a color by a percentage
   */
  static darken(color: string, percent: number): string {
    return ColorUtils.lighten(color, -percent)
  }

  /**
   * Check if color is light (for determining text color)
   */
  static isLight(color: string): boolean {
    const cleanHex = color.replace('#', '')
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128
  }

  /**
   * Get contrasting text color (black or white) for a background
   */
  static getContrastColor(backgroundColor: string): string {
    return ColorUtils.isLight(backgroundColor) ? '#000000' : '#FFFFFF'
  }
}

/**
 * Predefined color shortcuts matching Raycast
 */
export const ColorScheme = {
  // Accent colors
  Red: Color.Red,
  Orange: Color.Orange,
  Yellow: Color.Yellow,
  Green: Color.Green,
  Blue: Color.Blue,
  Purple: Color.Purple,
  Pink: Color.Pink,
  Brown: Color.Brown,

  // Neutral colors
  Gray: Color.DarkGray,
  LightGray: Color.LightGray,

  // Text colors
  Text: Color.PrimaryText,
  SecondaryText: Color.SecondaryText,
}

export default Color
