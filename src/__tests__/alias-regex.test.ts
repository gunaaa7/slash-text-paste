// Unit test for shortcut extraction regex

describe("Shortcut Regex", () => {
  const shortcutRegex = /\/([A-Za-z]+)$/

  test("should match valid shortcuts at end of string", () => {
    expect("Hello /demo".match(shortcutRegex)).toBeTruthy()
    expect("Type /test".match(shortcutRegex)?.[1]).toBe("test")
    expect("/shortcut".match(shortcutRegex)?.[1]).toBe("shortcut")
  })

  test("should not match invalid shortcuts", () => {
    expect("Hello /demo123".match(shortcutRegex)).toBeFalsy()
    expect("Hello /demo-test".match(shortcutRegex)).toBeFalsy()
    expect("Hello /demo_test".match(shortcutRegex)).toBeFalsy()
    expect("Hello /123".match(shortcutRegex)).toBeFalsy()
  })

  test("should not match shortcuts not at end of string", () => {
    expect("Hello /demo world".match(shortcutRegex)).toBeFalsy()
    expect("/demo test".match(shortcutRegex)).toBeFalsy()
  })

  test("should match case-insensitive shortcuts", () => {
    expect("/Demo".match(shortcutRegex)?.[1]).toBe("Demo")
    expect("/DEMO".match(shortcutRegex)?.[1]).toBe("DEMO")
    expect("/dEmO".match(shortcutRegex)?.[1]).toBe("dEmO")
  })

  test("should handle empty and edge cases", () => {
    expect("".match(shortcutRegex)).toBeFalsy()
    expect("/".match(shortcutRegex)).toBeFalsy()
    expect("Hello /".match(shortcutRegex)).toBeFalsy()
  })
})
