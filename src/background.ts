// Background service worker for handling storage operations and messages

// Message types
interface ExpandMessage {
  type: "EXPAND"
  shortcut: string
}

interface GetShortcutsMessage {
  type: "GET_SHORTCUTS"
}

interface SaveShortcutMessage {
  type: "SAVE_SHORTCUT"
  shortcut: string
  text: string
}

interface DeleteShortcutMessage {
  type: "DELETE_SHORTCUT"
  shortcut: string
}

type Message = ExpandMessage | GetShortcutsMessage | SaveShortcutMessage | DeleteShortcutMessage

// Storage helpers
async function getShortcuts(): Promise<Record<string, string>> {
  const result = await chrome.storage.sync.get(["shortcuts", "aliases"])
  if (result.shortcuts) {
    return result.shortcuts
  }

  if (result.aliases) {
    await chrome.storage.sync.set({ shortcuts: result.aliases })
    await chrome.storage.sync.remove(["aliases"])
    return result.aliases
  }

  return {}
}

async function saveShortcut(shortcut: string, text: string): Promise<void> {
  const shortcuts = await getShortcuts()
  shortcuts[shortcut.toLowerCase()] = text
  await chrome.storage.sync.set({ shortcuts })
}

async function deleteShortcut(shortcut: string): Promise<void> {
  const shortcuts = await getShortcuts()
  delete shortcuts[shortcut.toLowerCase()]
  await chrome.storage.sync.set({ shortcuts })
}

async function expandShortcut(shortcut: string): Promise<string | null> {
  const shortcuts = await getShortcuts()
  return shortcuts[shortcut.toLowerCase()] || null
}

// Message handler
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  switch (message.type) {
    case "EXPAND":
      expandShortcut(message.shortcut).then(sendResponse)
      return true // Keep message channel open for async response

    case "GET_SHORTCUTS":
      getShortcuts().then(sendResponse)
      return true

    case "SAVE_SHORTCUT":
      saveShortcut(message.shortcut, message.text).then(() => sendResponse(true))
      return true

    case "DELETE_SHORTCUT":
      deleteShortcut(message.shortcut).then(() => sendResponse(true))
      return true

    default:
      sendResponse(null)
  }
})

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["shortcuts", "aliases"], (result) => {
    if (result.shortcuts) return
    if (result.aliases) {
      chrome.storage.sync.set({ shortcuts: result.aliases }, () => {
        chrome.storage.sync.remove(["aliases"])
      })
      return
    }

    chrome.storage.sync.set({
      shortcuts: {
        demo: "This is a demo expansion text! dYs?",
      },
    })
  })
})
