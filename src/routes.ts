import { Routes } from '@lit-labs/router'
import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import './components/global-drop-handler.js'

// Polyfills URLPattern to handle better borwsers compatibility.
// @see: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern#browser_compatibility
// @ts-expect-error: Property 'UrlPattern' does not exist
import 'urlpattern-polyfill'

@customElement('my-app')
export class MyApp extends LitElement {
  private _routes = new Routes(
    this,
    [
      {
        path: '/',
        render: () => html`
          <launcher-layout>
            <view-search></view-search>
          </launcher-layout>
        `,
      },
      {
        path: '/chat',
        render: () => html`
          <launcher-layout>
            <a2ui-chat></a2ui-chat>
          </launcher-layout>
        `,
      },
      {
        path: '/plugin-generator',
        render: () => html`
          <launcher-layout>
            <plugin-generator-view></plugin-generator-view>
          </launcher-layout>
        `,
      },
    ],
    {
      fallback: {
        render: () => html` <launcher-layout><view-search></view-search></launcher-layout> `,
      },
    },
  )

  render() {
    // Make sure the app is only rendered in Tauri environment.
    // If __TAURI__ doesn't exist, render the error browser view.
    const appContent =
      import.meta.env.PROD && !('__TAURI__' in window)
        ? html`<error-browser></error-browser>`
        : this._routes.outlet()

    return html`
      ${appContent}
      <global-drop-handler></global-drop-handler>
    `
  }

  connectedCallback() {
    super.connectedCallback()

    // Handle the back/forward browser navigation
    window.addEventListener('popstate', () => this.requestUpdate())

    // Always navigate to /search (the launcher interface)
    this._routes.goto('/search')
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('popstate', () => this.requestUpdate())
  }

  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      background-color: var(--color-background);
      color: var(--color-foreground);
      font-family: var(--font-sans);
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'my-app': MyApp
  }
}
