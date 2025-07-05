// Background service worker for handling storage operations and messages

interface Alias {
  alias: string
  text: string
}

interface StorageData {
  aliases: Record<string, string>
}

// Message types
interface ExpandMessage {
  type: "EXPAND"
  alias: string
}

interface GetAliasesMessage {
  type: "GET_ALIASES"
}

interface SaveAliasMessage {
  type: "SAVE_ALIAS"
  alias: string
  text: string
}

interface DeleteAliasMessage {
  type: "DELETE_ALIAS"
  alias: string
}

type Message = ExpandMessage | GetAliasesMessage | SaveAliasMessage | DeleteAliasMessage

// Storage helpers
async function getAliases(): Promise<Record<string, string>> {
  const result = await chrome.storage.sync.get(["aliases"])
  return result.aliases || {}
}

async function saveAlias(alias: string, text: string): Promise<void> {
  const aliases = await getAliases()
  aliases[alias.toLowerCase()] = text
  await chrome.storage.sync.set({ aliases })
}

async function deleteAlias(alias: string): Promise<void> {
  const aliases = await getAliases()
  delete aliases[alias.toLowerCase()]
  await chrome.storage.sync.set({ aliases })
}

async function expandAlias(alias: string): Promise<string | null> {
  const aliases = await getAliases()
  return aliases[alias.toLowerCase()] || null
}

// Message handler
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  switch (message.type) {
    case "EXPAND":
      expandAlias(message.alias).then(sendResponse)
      return true // Keep message channel open for async response

    case "GET_ALIASES":
      getAliases().then(sendResponse)
      return true

    case "SAVE_ALIAS":
      saveAlias(message.alias, message.text).then(() => sendResponse(true))
      return true

    case "DELETE_ALIAS":
      deleteAlias(message.alias).then(() => sendResponse(true))
      return true

    default:
      sendResponse(null)
  }
})

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["aliases"], (result) => {
    if (!result.aliases) {
      chrome.storage.sync.set({
        aliases: {
          demo: "This is a demo expansion text! 🚀",
        },
      })
    }
  })
})
