# Rebuild the matching PNG icons with Windows' built-in drawing library.
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'public/icons'
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null
foreach ($icon in @(
    @{ Name = 'icon-192.png'; Size = 192 },
    @{ Name = 'icon-512.png'; Size = 512 },
    @{ Name = 'maskable-512.png'; Size = 512 },
    @{ Name = 'apple-touch-icon.png'; Size = 180 }
)) {
    $bitmap = [System.Drawing.Bitmap]::new($icon.Size, $icon.Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fafafa'))
    try {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#1c1c1c'))
        $graphics.ScaleTransform($icon.Size / 512.0, $icon.Size / 512.0)
        # The T mark stays inside the maskable icon's central safe area.
        $graphics.FillRectangle($brush, 148, 152, 216, 48)
        $graphics.FillRectangle($brush, 232, 200, 48, 160)
        $bitmap.Save((Join-Path $iconDirectory $icon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $brush.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
