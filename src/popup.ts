// Popup UI for managing shortcuts

interface Shortcut {
  shortcut: string
  text: string
}

class PopupManager {
  private shortcutInput: HTMLInputElement
  private textInput: HTMLTextAreaElement
  private saveBtn: HTMLButtonElement
  private cancelBtn: HTMLButtonElement
  private shortcutsList: HTMLElement
  private editingShortcut: string | null = null

  constructor() {
    this.shortcutInput = document.getElementById("shortcut-input") as HTMLInputElement
    this.textInput = document.getElementById("text-input") as HTMLTextAreaElement
    this.saveBtn = document.getElementById("save-btn") as HTMLButtonElement
    this.cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement
    this.shortcutsList = document.getElementById("shortcuts-list") as HTMLElement

    this.initializeEventListeners()
    this.loadShortcuts()
  }

  private initializeEventListeners(): void {
    this.saveBtn.addEventListener("click", () => this.handleSave())
    this.cancelBtn.addEventListener("click", () => this.handleCancel())

    this.shortcutInput.addEventListener("input", () => this.validateForm())
    this.textInput.addEventListener("input", () => this.validateForm())

    // Handle Enter key in inputs
    this.shortcutInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        this.textInput.focus()
      }
    })

    this.textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault()
        this.handleSave()
      }
    })
  }

  private validateForm(): void {
    const shortcut = this.shortcutInput.value.trim()
    const text = this.textInput.value.trim()
    const isValid = shortcut.length > 0 && text.length > 0 && /^[A-Za-z]+$/.test(shortcut)

    this.saveBtn.disabled = !isValid

    // Show validation error
    this.clearError()
    if (shortcut.length > 0 && !/^[A-Za-z]+$/.test(shortcut)) {
      this.showError("Shortcut must contain only letters")
    }
  }

  private showError(message: string): void {
    this.clearError()
    const error = document.createElement("div")
    error.className = "error"
    error.textContent = message
    this.shortcutInput.parentNode?.appendChild(error)
  }

  private clearError(): void {
    const error = document.querySelector(".error")
    if (error) {
      error.remove()
    }
  }

  private async handleSave(): Promise<void> {
    const shortcut = this.shortcutInput.value.trim().toLowerCase()
    const text = this.textInput.value.trim()

    if (!shortcut || !text || !/^[A-Za-z]+$/.test(shortcut)) {
      return
    }

    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_SHORTCUT",
        shortcut,
        text,
      })

      if (this.editingShortcut && this.editingShortcut !== shortcut) {
        await chrome.runtime.sendMessage({
          type: "DELETE_SHORTCUT",
          shortcut: this.editingShortcut,
        })
      }

      this.clearForm()
      this.loadShortcuts()
    } catch (error) {
      console.error("Failed to save shortcut:", error)
      this.showError("Failed to save shortcut")
    }
  }

  private handleCancel(): void {
    this.clearForm()
  }

  private clearForm(): void {
    this.shortcutInput.value = ""
    this.textInput.value = ""
    this.editingShortcut = null
    this.saveBtn.textContent = "Save Shortcut"
    this.cancelBtn.style.display = "none"
    this.validateForm()
    this.clearError()
  }

  private async loadShortcuts(): Promise<void> {
    try {
      const shortcuts = await chrome.runtime.sendMessage({ type: "GET_SHORTCUTS" })
      this.renderShortcuts(shortcuts)
    } catch (error) {
      console.error("Failed to load shortcuts:", error)
      this.shortcutsList.innerHTML = '<div class="error">Failed to load shortcuts</div>'
    }
  }

  private renderShortcuts(shortcuts: Record<string, string>): void {
    const shortcutEntries = Object.entries(shortcuts)

    if (shortcutEntries.length === 0) {
      this.shortcutsList.innerHTML = `
        <div class="empty-state">
          No shortcuts saved yet.<br>
          Create your first shortcut above!
        </div>
      `
      return
    }

    // Sort shortcuts alphabetically
    shortcutEntries.sort(([a], [b]) => a.localeCompare(b))

    this.shortcutsList.innerHTML = shortcutEntries
      .map(([shortcut, text]) => this.renderShortcutItem(shortcut, text))
      .join("")

    // Add event listeners to buttons
    this.shortcutsList.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const shortcut = (e.target as HTMLElement).dataset.shortcut!
        this.editShortcut(shortcut, shortcuts[shortcut])
      })
    })

    this.shortcutsList.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const shortcut = (e.target as HTMLElement).dataset.shortcut!
        this.deleteShortcut(shortcut)
      })
    })
  }

  private renderShortcutItem(shortcut: string, text: string): string {
    const truncatedText = text.length > 100 ? text.substring(0, 100) + "..." : text

    return `
      <div class="alias-item">
        <div class="alias-content">
          <div class="alias-name">/${shortcut}</div>
          <div class="alias-text">${this.escapeHtml(truncatedText)}</div>
        </div>
        <div class="alias-actions">
          <button class="btn btn-small btn-edit" data-shortcut="${shortcut}">Edit</button>
          <button class="btn btn-small btn-delete" data-shortcut="${shortcut}">Delete</button>
        </div>
      </div>
    `
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  private editShortcut(shortcut: string, text: string): void {
    this.shortcutInput.value = shortcut
    this.textInput.value = text
    this.editingShortcut = shortcut
    this.saveBtn.textContent = "Update Shortcut"
    this.cancelBtn.style.display = "inline-block"
    this.validateForm()
    this.shortcutInput.focus()
  }

  private async deleteShortcut(shortcut: string): Promise<void> {
    if (!confirm(`Delete shortcut "/${shortcut}"?`)) {
      return
    }

    try {
      await chrome.runtime.sendMessage({
        type: "DELETE_SHORTCUT",
        shortcut,
      })

      // Clear form if we were editing this shortcut
      if (this.editingShortcut === shortcut) {
        this.clearForm()
      }

      this.loadShortcuts()
    } catch (error) {
      console.error("Failed to delete shortcut:", error)
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager()
})
