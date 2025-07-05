const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

// Ensure dist directory exists
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist")
}

// Copy static files
const staticFiles = [
  { from: "manifest.json", to: "manifest.json" },
  { from: "popup/popup.html", to: "popup/popup.html" },
  { from: "popup/popup.css", to: "popup/popup.css" },
]

staticFiles.forEach(({ from, to }) => {
  const fromPath = path.join(__dirname, from)
  const toPath = path.join(__dirname, "dist", to)

  // Ensure directory exists
  const dir = path.dirname(toPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (fs.existsSync(fromPath)) {
    fs.copyFileSync(fromPath, toPath)
    console.log(`Copied ${from} -> dist/${to}`)
  }
})

// Copy and rewrite manifest.json
const manifestSrc = path.join(__dirname, "manifest.json")
const manifestDest = path.join(__dirname, "dist", "manifest.json")
if (fs.existsSync(manifestSrc)) {
  const manifest = JSON.parse(fs.readFileSync(manifestSrc, "utf8"))
  // Fix background.service_worker path
  if (manifest.background && manifest.background.service_worker) {
    manifest.background.service_worker = manifest.background.service_worker.replace(/^dist\//, "")
  }
  // Fix content_scripts js paths
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach(cs => {
      if (cs.js) {
        cs.js = cs.js.map(jsPath => jsPath.replace(/^dist\//, ""))
      }
    })
  }
  // Fix action.default_popup path
  if (manifest.action && manifest.action.default_popup) {
    manifest.action.default_popup = manifest.action.default_popup.replace(/^dist\//, "")
  }
  // Fix action.default_icon and icons paths
  [manifest.action?.default_icon, manifest.icons].forEach(iconSet => {
    if (iconSet) {
      Object.keys(iconSet).forEach(size => {
        iconSet[size] = iconSet[size].replace(/^dist\//, "")
      })
    }
  })
  fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2))
  console.log("Rewrote and copied manifest.json -> dist/manifest.json")
}

// Create icons directory and placeholder icon
const iconsDir = path.join(__dirname, "dist", "icons")
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Create a simple SVG icon and convert to different sizes
const iconSvg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#2383e2"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">/</text>
</svg>`

// For simplicity, we'll create a basic PNG placeholder
// In a real project, you'd use a proper image conversion tool
const iconSizes = [16, 32, 48, 128]
iconSizes.forEach((size) => {
  const iconPath = path.join(iconsDir, `icon-${size}.png`)
  // Create a simple text file as placeholder - in real usage, convert SVG to PNG
  fs.writeFileSync(iconPath, iconSvg)
})

// Build TypeScript files
const buildOptions = {
  entryPoints: ["src/background.ts", "src/content-script.ts", "src/popup.ts"],
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "es2020",
  minify: process.argv.includes("--production"),
  sourcemap: !process.argv.includes("--production"),
  logLevel: "info",
}

if (process.argv.includes("--watch")) {
  esbuild.context(buildOptions).then((ctx) => {
    ctx.watch()
    console.log("Watching for changes...")
  })
} else {
  esbuild
    .build(buildOptions)
    .then(() => {
      console.log("Build completed successfully!")
    })
    .catch(() => process.exit(1))
}
