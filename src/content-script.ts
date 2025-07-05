// Content script for handling text expansion in editable fields

interface ExpansionState {
  element: HTMLElement
  originalText: string
  cursorPosition: number
  aliasStart: number
  aliasEnd: number
}

let lastExpansion: ExpansionState | null = null

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
    return {
      text: input.value,
      cursor: input.selectionStart || 0,
    }
  } else {
    // ContentEditable element
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return { text: "", cursor: 0 }

    const range = selection.getRangeAt(0)
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
    input.value = text
    input.setSelectionRange(cursor, cursor)
  } else {
    // ContentEditable element
    element.textContent = text

    // Set cursor position
    const selection = window.getSelection()
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
  const match = beforeCursor.match(/\/([A-Za-z]+)$/)

  if (match) {
    const alias = match[1]
    const start = cursorPos - match[0].length
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
function handleKeyDown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement

  if (!isEditableElement(target) || isExcludedElement(target)) return

  // Handle Tab key for expansion
  if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    handleTabExpansion(target).then((expanded) => {
      if (expanded) {
        event.preventDefault()
      }
    })
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

// Clear expansion state when focus changes
document.addEventListener("focusin", () => {
  lastExpansion = null
})
