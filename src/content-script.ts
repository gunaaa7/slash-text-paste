// Content script for handling text expansion in editable fields

interface ExpansionState {
  element: HTMLElement
  originalText: string
  cursorPosition: number
  aliasStart: number
  aliasEnd: number
}

let lastExpansion: ExpansionState | null = null
let aliasesCache: Record<string, string> = {}
let recentTextBuffer = ""
let recentTextElement: HTMLElement | null = null
const maxBufferLength = 200

async function loadAliasesCache(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(["aliases"])
    aliasesCache = result.aliases || {}
  } catch (error) {
    console.error("Failed to load aliases cache:", error)
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.aliases) return
  aliasesCache = changes.aliases.newValue || {}
})

loadAliasesCache()

// Check if element should be excluded from expansion
function isExcludedElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  const type = (element as HTMLInputElement).type?.toLowerCase()

  // Exclude password and payment-related inputs
  if (type === "password" || (type === "email" && element.getAttribute("autocomplete")?.includes("cc-"))) {
    return true
  }

  // Check for payment-related attributes
  const autocomplete = element.getAttribute("autocomplete")?.toLowerCase() || ""
  if (autocomplete.includes("cc-") || autocomplete.includes("card")) {
    return true
  }

  return false
}

// Check if element is editable
function isEditableElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()

  if (tagName === "input") {
    const input = element as HTMLInputElement
    const type = input.type.toLowerCase()
    return ["text", "search", "url", "tel", "email"].includes(type) && !input.readOnly
  }

  if (tagName === "textarea") {
    return !(element as HTMLTextAreaElement).readOnly
  }

  return element.contentEditable === "true"
}

// Get text content and cursor position
function getTextAndCursor(element: HTMLElement): { text: string; cursor: number } {
  if (element.tagName.toLowerCase() === "input" || element.tagName.toLowerCase() === "textarea") {
    const input = element as HTMLInputElement | HTMLTextAreaElement
    const selectionStart = input.selectionStart
    return {
      text: input.value,
      cursor: selectionStart !== null ? selectionStart : input.value.length,
    }
  } else {
    // ContentEditable element
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return { text: "", cursor: 0 }

    const range = selection.getRangeAt(0)
    const startNode = range.startContainer
    if (startNode.nodeType === Node.TEXT_NODE) {
      return {
        text: startNode.textContent || "",
        cursor: range.startOffset,
      }
    }
    const textContent = element.textContent || ""

    // Calculate cursor position in text content
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    return {
      text: textContent,
      cursor: preCaretRange.toString().length,
    }
  }
}

// Set text content and cursor position
function setTextAndCursor(element: HTMLElement, text: string, cursor: number): void {
  if (element.tagName.toLowerCase() === "input" || element.tagName.toLowerCase() === "textarea") {
    const input = element as HTMLInputElement | HTMLTextAreaElement
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    if (valueSetter) {
      valueSetter.call(input, text)
    } else {
      input.value = text
    }
    input.dispatchEvent(new Event("input", { bubbles: true }))
    if (typeof (input as HTMLInputElement).setSelectionRange === "function") {
      try {
        input.setSelectionRange(cursor, cursor)
      } catch (error) {
        console.debug("[slash-expander] selection not supported for input type", (input as HTMLInputElement).type)
      }
    }
  } else {
    // ContentEditable element
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const startNode = range.startContainer
      if (startNode.nodeType === Node.TEXT_NODE) {
        const textNode = startNode as Text
        textNode.textContent = text
        const safePosition = Math.min(cursor, text.length)
        range.setStart(textNode, safePosition)
        range.setEnd(textNode, safePosition)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
    }

    element.textContent = text

    // Set cursor position
    if (selection) {
      const range = document.createRange()
      const textNode = element.firstChild
      if (textNode) {
        const safePosition = Math.min(cursor, textNode.textContent?.length || 0)
        range.setStart(textNode, safePosition)
        range.setEnd(textNode, safePosition)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }
}

// Extract alias from text at cursor position
function extractAlias(text: string, cursorPos: number): { alias: string; start: number; end: number } | null {
  // Look backwards from cursor to find /alias pattern
  const beforeCursor = text.substring(0, cursorPos)
  const match = /(^|\s)\/([A-Za-z]+)$/.exec(beforeCursor)

  if (match) {
    const alias = match[2]
    const start = (match.index ?? 0) + match[1].length
    const end = cursorPos
    return { alias, start, end }
  }

  return null
}

// Show toast notification
function showToast(message: string): void {
  const toast = document.createElement("div")
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: opacity 0.3s ease;
  `

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 1000)
}

function updateRecentBuffer(element: HTMLElement, value: string): void {
  recentTextElement = element
  recentTextBuffer = value.slice(-maxBufferLength)
}

function handleInput(event: Event): void {
  const target = event.target as HTMLElement | null
  if (!target || !isEditableElement(target) || isExcludedElement(target)) return

  if (target.tagName.toLowerCase() === "input" || target.tagName.toLowerCase() === "textarea") {
    const input = target as HTMLInputElement | HTMLTextAreaElement
    updateRecentBuffer(target, input.value)
    return
  }

  if (target.isContentEditable) {
    const inputEvent = event as InputEvent
    const inputType = inputEvent.inputType || ""
    if (inputType === "insertText" && inputEvent.data) {
      recentTextBuffer = (recentTextBuffer + inputEvent.data).slice(-maxBufferLength)
    } else if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
      recentTextBuffer = (recentTextBuffer + "\n").slice(-maxBufferLength)
    } else if (inputType.startsWith("delete")) {
      recentTextBuffer = recentTextBuffer.slice(0, Math.max(0, recentTextBuffer.length - 1))
    } else if (target.textContent) {
      updateRecentBuffer(target, target.textContent)
    }
    recentTextElement = target
  }
}

function handleSelectionChange(): void {
  const activeElement = document.activeElement as HTMLElement | null
  if (activeElement && activeElement !== recentTextElement && activeElement.isContentEditable) {
    recentTextElement = activeElement
    recentTextBuffer = ""
    return
  }

  const selection = window.getSelection()
  if (selection?.anchorNode) {
    const anchorElement =
      selection.anchorNode instanceof HTMLElement ? selection.anchorNode : selection.anchorNode.parentElement
    const editableAncestor = anchorElement?.closest('[contenteditable="true"]') as HTMLElement | null
    if (editableAncestor && editableAncestor !== recentTextElement) {
      recentTextElement = editableAncestor
      recentTextBuffer = ""
    }
  }
}

async function expandAliasFromSelection(alias: string, aliasLength: number): Promise<boolean> {
  try {
    const expandedText = await chrome.runtime.sendMessage({
      type: "EXPAND",
      alias,
    })

    if (!expandedText) {
      return false
    }

    const selection = window.getSelection()
    if (!selection) return false

    if (typeof selection.modify === "function") {
      for (let i = 0; i < aliasLength; i += 1) {
        selection.modify("extend", "backward", "character")
      }
      document.execCommand("insertText", false, expandedText)
      return true
    }
  } catch (error) {
    console.error("Failed to expand alias:", error)
  }

  return false
}

// Handle Tab key for expansion
async function handleTabExpansion(element: HTMLElement): Promise<boolean> {
  const { text, cursor } = getTextAndCursor(element)
  const aliasMatch = extractAlias(text, cursor)

  if (!aliasMatch) return false

  try {
    const expandedText = await chrome.runtime.sendMessage({
      type: "EXPAND",
      alias: aliasMatch.alias,
    })

    if (expandedText) {
      // Store expansion state for undo
      lastExpansion = {
        element,
        originalText: text,
        cursorPosition: cursor,
        aliasStart: aliasMatch.start,
        aliasEnd: aliasMatch.end,
      }

      // Replace alias with expanded text
      const newText = text.substring(0, aliasMatch.start) + expandedText + text.substring(aliasMatch.end)
      const newCursor = aliasMatch.start + expandedText.length

      setTextAndCursor(element, newText, newCursor)
      showToast(`Expanded '/${aliasMatch.alias}'`)

      return true
    }
    console.info("[slash-expander] no expansion found for", aliasMatch.alias)
  } catch (error) {
    console.error("Failed to expand alias:", error)
  }

  return false
}

// Handle Ctrl+Z for undo
function handleUndo(element: HTMLElement): boolean {
  if (!lastExpansion || lastExpansion.element !== element) return false

  // Restore original text and cursor position
  setTextAndCursor(lastExpansion.element, lastExpansion.originalText, lastExpansion.cursorPosition)
  lastExpansion = null

  return true
}

// Main keydown event handler
function resolveEditableTarget(event: KeyboardEvent): HTMLElement | null {
  const activeElement = document.activeElement as HTMLElement | null
  if (activeElement && isEditableElement(activeElement) && !isExcludedElement(activeElement)) {
    return activeElement
  }

  const selection = window.getSelection()
  if (selection?.anchorNode) {
    const anchorElement =
      selection.anchorNode instanceof HTMLElement ? selection.anchorNode : selection.anchorNode.parentElement
    if (anchorElement) {
      const editableAncestor = anchorElement.closest('[contenteditable="true"]') as HTMLElement | null
      if (editableAncestor && !isExcludedElement(editableAncestor)) {
        return editableAncestor
      }
    }
  }

  const path = event.composedPath?.() || []
  for (const node of path) {
    if (node instanceof HTMLElement && isEditableElement(node) && !isExcludedElement(node)) {
      return node
    }
  }

  const directTarget = event.target as HTMLElement | null
  if (directTarget && isEditableElement(directTarget) && !isExcludedElement(directTarget)) {
    return directTarget
  }

  return null
}

function handleKeyDown(event: KeyboardEvent): void {
  const target = resolveEditableTarget(event)
  if (!target) return

  // Handle Tab key for expansion
  if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const { text, cursor } = getTextAndCursor(target)
    let aliasMatch = extractAlias(text, cursor)
    let fromBuffer = false

    if (!aliasMatch && target.isContentEditable && recentTextElement === target && recentTextBuffer.length > 0) {
      aliasMatch = extractAlias(recentTextBuffer, recentTextBuffer.length)
      fromBuffer = Boolean(aliasMatch)
    }

    if (!aliasMatch) return

    const cachedText = aliasesCache[aliasMatch.alias.toLowerCase()]
    if (!cachedText) return

    // Prevent focus from moving before async expansion completes.
    event.preventDefault()
    if (fromBuffer) {
      expandAliasFromSelection(aliasMatch.alias, aliasMatch.end - aliasMatch.start).catch((error) => {
        console.error("Failed to expand alias:", error)
      })
    } else {
      handleTabExpansion(target).catch((error) => {
        console.error("Failed to expand alias:", error)
      })
    }
  }

  // Handle Ctrl+Z for undo
  if (event.key === "z" && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
    if (handleUndo(target)) {
      event.preventDefault()
    }
  }
}

// Initialize content script
document.addEventListener("keydown", handleKeyDown, true)
document.addEventListener("input", handleInput, true)
document.addEventListener("selectionchange", handleSelectionChange)

// Clear expansion state when focus changes
document.addEventListener("focusin", () => {
  lastExpansion = null
})
