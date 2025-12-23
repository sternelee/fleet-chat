/**
 * React Hooks compatibility for Fleet Chat
 *
 * Provides React-compatible hooks that work with Lit components
 * and Tauri environment
 */

// Simple state management for compatibility
interface HookState<T> {
  value: T
  listeners: Set<(value: T) => void>
}

const hookStates = new Map<string, HookState<any>>()

/**
 * Simple useState implementation for compatibility
 */
export function useState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const hookId = Math.random().toString(36).substr(2, 9)

  if (!hookStates.has(hookId)) {
    hookStates.set(hookId, {
      value: initialValue,
      listeners: new Set(),
    })
  }

  const state = hookStates.get(hookId)!

  const setValue = (newValue: T | ((prev: T) => T)) => {
    const resolvedValue =
      typeof newValue === 'function' ? (newValue as (prev: T) => T)(state.value) : newValue

    if (resolvedValue !== state.value) {
      state.value = resolvedValue
      state.listeners.forEach((listener) => listener(resolvedValue))
    }
  }

  return [state.value, setValue]
}

/**
 * Simple useEffect implementation
 */
export function useEffect(effect: () => void | (() => void), _deps?: any[]): void {
  // Simple effect implementation - would need more sophisticated handling for real use
  setTimeout(effect, 0)
}

/**
 * Simple useCallback implementation
 */
export function useCallback<T extends (...args: any[]) => any>(callback: T, _deps?: any[]): T {
  return callback
}

/**
 * Simple useMemo implementation
 */
export function useMemo<T>(factory: () => T, _deps?: any[]): T {
  return factory()
}

/**
 * Simple useRef implementation
 */
export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue }
}

/**
 * Simple useReducer implementation
 */
export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  initialState: T,
): [T, (action: A) => void] {
  const [state, setState] = useState(initialState)

  const dispatch = (action: A) => {
    setState((prevState) => reducer(prevState, action))
  }

  return [state, dispatch]
}

/**
 * Simple useContext implementation
 */
export function createContext<T>(defaultValue: T): {
  Provider: ({ value, children }: { value: T; children: any }) => any
  useContext: () => T
} {
  let currentValue = defaultValue
  const listeners = new Set<(value: T) => void>()

  const Provider = ({ value, children }: { value: T; children: any }) => {
    currentValue = value
    listeners.forEach((listener) => listener(value))
    return children
  }

  const useContext = (): T => {
    return currentValue
  }

  return { Provider, useContext }
}
