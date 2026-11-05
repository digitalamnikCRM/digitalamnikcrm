# Digital Amnik CRM - Standalone Local Dev Server
# Runs on an isolated port without conflicting with existing localhost services

$preferredPort = 8090
$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = (Get-Location).Path }

$mimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".pdf"  = "application/pdf"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

$port = $preferredPort
$listener = $null

while ($port -lt 8105) {
    try {
        $listener = New-Object System.Net.HttpListener
        $prefix = "http://localhost:$port/"
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        break
    } catch {
        if ($listener) { $listener.Close() }
        $port++
    }
}

if (-not $listener.IsListening) {
    Write-Error "Could not bind to any port between $preferredPort and 8105."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [DIGITAL AMNIK CRM] Local Testing Server Active" -ForegroundColor Green
Write-Host " Port: $port" -ForegroundColor Yellow
Write-Host " Employee Portal:  http://localhost:$port/" -ForegroundColor White
Write-Host " Admin Portal:     http://localhost:$port/admin.html" -ForegroundColor White
Write-Host " Root Directory:   $rootPath" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop server.`n"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        # Normalize relative path safely
        $cleanPath = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::Combine($rootPath, $cleanPath)

        # CORS and Cache Control Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.AddHeader("Pragma", "no-cache")
        $response.AddHeader("Expires", "0")

        if ([System.IO.File]::Exists($fullPath)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            $response.StatusCode = 200

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1><p>File $urlPath not found.</p>")
            $response.ContentType = "text/html"
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }

        $response.OutputStream.Close()
    }
} finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}
