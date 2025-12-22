/**
 * Tauri type declarations
 */

declare global {
  interface Window {
    __TAURI__?: {
      __TAURI_INTERNALS__: {
        transformCallback: (callback: any) => number;
        invoke: <T>(cmd: string, args?: any) => Promise<T>;
      };
    };
  }
}

export { };
