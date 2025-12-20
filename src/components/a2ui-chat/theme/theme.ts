// Simplified theme for A2UI Chat component
export const theme = {
  colorScheme: "light" as const,
  primary: "#137fec",
  surface: "#ffffff",
  onSurface: "#000000",

  // CSS custom properties
  cssVariables: {
    "--a2ui-primary": "#137fec",
    "--a2ui-surface": "#ffffff",
    "--a2ui-on-surface": "#000000",
    "--a2ui-primary-variant": "#0d6efd",
    "--a2ui-surface-variant": "#f8f9fa",
    "--a2ui-background": "#ffffff",
    "--a2ui-error": "#dc3545",
    "--a2ui-warning": "#ffc107",
    "--a2ui-success": "#28a745",
    "--a2ui-info": "#17a2b8",

    // Spacing
    "--a2ui-spacing-xs": "4px",
    "--a2ui-spacing-sm": "8px",
    "--a2ui-spacing-md": "16px",
    "--a2ui-spacing-lg": "24px",
    "--a2ui-spacing-xl": "32px",

    // Border radius
    "--a2ui-radius-sm": "4px",
    "--a2ui-radius-md": "8px",
    "--a2ui-radius-lg": "12px",
    "--a2ui-radius-xl": "16px",

    // Typography
    "--a2ui-font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "--a2ui-font-size-xs": "12px",
    "--a2ui-font-size-sm": "14px",
    "--a2ui-font-size-md": "16px",
    "--a2ui-font-size-lg": "18px",
    "--a2ui-font-size-xl": "24px",

    // Shadow
    "--a2ui-shadow-sm": "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
    "--a2ui-shadow-md": "0 4px 6px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.24)",
    "--a2ui-shadow-lg": "0 10px 20px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.24)",
  }
};

export type Theme = typeof theme;
