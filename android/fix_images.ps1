
$path = "c:\Marketing\public\mobile\js\app.js"
$content = Get-Content $path -Raw

$jsHelper = @"

function getAbsoluteImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    const base = window.API_BASE_URL || '';
    return base + (path.startsWith('/') ? '' : '/') + path;
}
"@

if (-not $content.Contains("function getAbsoluteImageUrl")) {
    $content = $jsHelper + "`n" + $content
}

# Simple string replacement for common patterns
$content = $content.Replace('src="${post.image || post.image_path}"', 'src="${getAbsoluteImageUrl(post.image || post.image_path)}"')
$content = $content.Replace('src="${post.image_path || post.image}"', 'src="${getAbsoluteImageUrl(post.image || post.image_path)}"')

Set-Content $path $content -NoNewline
Write-Host "Successfully updated app.js"
