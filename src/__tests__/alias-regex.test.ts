// Unit test for alias extraction regex

describe("Alias Regex", () => {
  const aliasRegex = /\/([A-Za-z]+)$/

  test("should match valid aliases at end of string", () => {
    expect("Hello /demo".match(aliasRegex)).toBeTruthy()
    expect("Type /test".match(aliasRegex)?.[1]).toBe("test")
    expect("/alias".match(aliasRegex)?.[1]).toBe("alias")
  })

  test("should not match invalid aliases", () => {
    expect("Hello /demo123".match(aliasRegex)).toBeFalsy()
    expect("Hello /demo-test".match(aliasRegex)).toBeFalsy()
    expect("Hello /demo_test".match(aliasRegex)).toBeFalsy()
    expect("Hello /123".match(aliasRegex)).toBeFalsy()
  })

  test("should not match aliases not at end of string", () => {
    expect("Hello /demo world".match(aliasRegex)).toBeFalsy()
    expect("/demo test".match(aliasRegex)).toBeFalsy()
  })

  test("should match case-insensitive aliases", () => {
    expect("/Demo".match(aliasRegex)?.[1]).toBe("Demo")
    expect("/DEMO".match(aliasRegex)?.[1]).toBe("DEMO")
    expect("/dEmO".match(aliasRegex)?.[1]).toBe("dEmO")
  })

  test("should handle empty and edge cases", () => {
    expect("".match(aliasRegex)).toBeFalsy()
    expect("/".match(aliasRegex)).toBeFalsy()
    expect("Hello /".match(aliasRegex)).toBeFalsy()
  })
})
