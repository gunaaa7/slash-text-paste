// Popup UI for managing aliases

interface Alias {
  alias: string
  text: string
}

class PopupManager {
  private aliasInput: HTMLInputElement
  private textInput: HTMLTextAreaElement
  private saveBtn: HTMLButtonElement
  private cancelBtn: HTMLButtonElement
  private aliasesList: HTMLElement
  private editingAlias: string | null = null

  constructor() {
    this.aliasInput = document.getElementById("alias-input") as HTMLInputElement
    this.textInput = document.getElementById("text-input") as HTMLTextAreaElement
    this.saveBtn = document.getElementById("save-btn") as HTMLButtonElement
    this.cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement
    this.aliasesList = document.getElementById("aliases-list") as HTMLElement

    this.initializeEventListeners()
    this.loadAliases()
  }

  private initializeEventListeners(): void {
    this.saveBtn.addEventListener("click", () => this.handleSave())
    this.cancelBtn.addEventListener("click", () => this.handleCancel())

    this.aliasInput.addEventListener("input", () => this.validateForm())
    this.textInput.addEventListener("input", () => this.validateForm())

    // Handle Enter key in inputs
    this.aliasInput.addEventListener("keydown", (e) => {
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
    const alias = this.aliasInput.value.trim()
    const text = this.textInput.value.trim()
    const isValid = alias.length > 0 && text.length > 0 && /^[A-Za-z]+$/.test(alias)

    this.saveBtn.disabled = !isValid

    // Show validation error
    this.clearError()
    if (alias.length > 0 && !/^[A-Za-z]+$/.test(alias)) {
      this.showError("Alias must contain only letters")
    }
  }

  private showError(message: string): void {
    this.clearError()
    const error = document.createElement("div")
    error.className = "error"
    error.textContent = message
    this.aliasInput.parentNode?.appendChild(error)
  }

  private clearError(): void {
    const error = document.querySelector(".error")
    if (error) {
      error.remove()
    }
  }

  private async handleSave(): Promise<void> {
    const alias = this.aliasInput.value.trim().toLowerCase()
    const text = this.textInput.value.trim()

    if (!alias || !text || !/^[A-Za-z]+$/.test(alias)) {
      return
    }

    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_ALIAS",
        alias,
        text,
      })

      if (this.editingAlias && this.editingAlias !== alias) {
        await chrome.runtime.sendMessage({
          type: "DELETE_ALIAS",
          alias: this.editingAlias,
        })
      }

      this.clearForm()
      this.loadAliases()
    } catch (error) {
      console.error("Failed to save alias:", error)
      this.showError("Failed to save alias")
    }
  }

  private handleCancel(): void {
    this.clearForm()
  }

  private clearForm(): void {
    this.aliasInput.value = ""
    this.textInput.value = ""
    this.editingAlias = null
    this.saveBtn.textContent = "Save Alias"
    this.cancelBtn.style.display = "none"
    this.validateForm()
    this.clearError()
  }

  private async loadAliases(): Promise<void> {
    try {
      const aliases = await chrome.runtime.sendMessage({ type: "GET_ALIASES" })
      this.renderAliases(aliases)
    } catch (error) {
      console.error("Failed to load aliases:", error)
      this.aliasesList.innerHTML = '<div class="error">Failed to load aliases</div>'
    }
  }

  private renderAliases(aliases: Record<string, string>): void {
    const aliasEntries = Object.entries(aliases)

    if (aliasEntries.length === 0) {
      this.aliasesList.innerHTML = `
        <div class="empty-state">
          No aliases saved yet.<br>
          Create your first alias above!
        </div>
      `
      return
    }

    // Sort aliases alphabetically
    aliasEntries.sort(([a], [b]) => a.localeCompare(b))

    this.aliasesList.innerHTML = aliasEntries.map(([alias, text]) => this.renderAliasItem(alias, text)).join("")

    // Add event listeners to buttons
    this.aliasesList.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const alias = (e.target as HTMLElement).dataset.alias!
        this.editAlias(alias, aliases[alias])
      })
    })

    this.aliasesList.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const alias = (e.target as HTMLElement).dataset.alias!
        this.deleteAlias(alias)
      })
    })
  }

  private renderAliasItem(alias: string, text: string): string {
    const truncatedText = text.length > 100 ? text.substring(0, 100) + "..." : text

    return `
      <div class="alias-item">
        <div class="alias-content">
          <div class="alias-name">/${alias}</div>
          <div class="alias-text">${this.escapeHtml(truncatedText)}</div>
        </div>
        <div class="alias-actions">
          <button class="btn btn-small btn-edit" data-alias="${alias}">Edit</button>
          <button class="btn btn-small btn-delete" data-alias="${alias}">Delete</button>
        </div>
      </div>
    `
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  private editAlias(alias: string, text: string): void {
    this.aliasInput.value = alias
    this.textInput.value = text
    this.editingAlias = alias
    this.saveBtn.textContent = "Update Alias"
    this.cancelBtn.style.display = "inline-block"
    this.validateForm()
    this.aliasInput.focus()
  }

  private async deleteAlias(alias: string): Promise<void> {
    if (!confirm(`Delete alias "/${alias}"?`)) {
      return
    }

    try {
      await chrome.runtime.sendMessage({
        type: "DELETE_ALIAS",
        alias,
      })

      // Clear form if we were editing this alias
      if (this.editingAlias === alias) {
        this.clearForm()
      }

      this.loadAliases()
    } catch (error) {
      console.error("Failed to delete alias:", error)
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager()
})
