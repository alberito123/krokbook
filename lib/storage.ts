/**
 * LocalStorage Utility Functions
 * 
 * Provides type-safe wrapper functions for localStorage operations.
 */

/**
 * Generate a unique ID using timestamp and random string
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get a value from localStorage with type safety
 * Returns defaultValue if key doesn't exist or parsing fails
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
    } catch {
        return defaultValue
    }
}

/**
 * Save a value to localStorage
 * Silently fails if localStorage is not available
 */
export function setToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(key, JSON.stringify(value))
        window.dispatchEvent(new Event('krokbook-storage-changed'))
    } catch (error) {
        console.error('Failed to save to localStorage:', error)
    }
}

/**
 * Remove a value from localStorage
 * Silently fails if localStorage is not available
 */
export function removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.removeItem(key)
        window.dispatchEvent(new Event('krokbook-storage-changed'))
    } catch (error) {
        console.error('Failed to remove from localStorage:', error)
    }
}
