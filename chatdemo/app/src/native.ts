import { importHistory } from './services/chat/backup.js'
import { useChatStore } from './services/chat/store.js'
import { setApiKey } from './services/settings.js'

declare global {
  interface Window {
    __dsImport?: (file: File) => Promise<number>
    __dsHasData?: () => boolean
    __dsReady?: () => boolean
    __dsSetKey?: (key: string) => void
    __dsGetKey?: () => string | null
  }
}

/**
 * 手机壳 / 外部引导页使用的最小钩子。
 * 只做三件事：导入 ZIP、查询是否已有数据、读写 API Key。
 * 导入直接复用官方 importHistory，避免自己重写 IndexedDB 事务。
 */
export const installNativeBridge = () => {
  window.__dsImport = (file: File) => importHistory(file)
  window.__dsHasData = () => useChatStore.getState().sessions.length > 0
  window.__dsReady = () => useChatStore.getState().ready
  window.__dsSetKey = (key: string) => setApiKey(key.trim() ? key.trim() : null)
  window.__dsGetKey = () => {
    try {
      return localStorage.getItem('chat-demo:api-key')
    } catch {
      return null
    }
  }
}
