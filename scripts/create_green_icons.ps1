Add-Type -AssemblyName System.Drawing

$sizes = @{
    "apple-touch-icon.png" = 180;
    "apple-touch-icon-180x180.png" = 180;
    "apple-touch-icon-precomposed.png" = 180;
    "icon-192.png" = 192;
    "icon-512.png" = 512;
    "app-logo.png" = 512;
    "favicon.png" = 64
}

# The airplane polygon coordinates defined in a 512x512 space (centered)
$rawPoints = @(
    @(357.47, 154.53),
    @(349.21, 171.04),
    @(331.05, 194.15),
    @(307.11, 219.74),
    @(295.56, 232.95),
    @(326.10, 331.18),
    @(318.67, 338.61),
    @(262.54, 265.97),
    @(232.00, 293.21),
    @(241.90, 332.83),
    @(236.13, 338.61),
    @(213.84, 308.07),
    @(196.50, 320.45),
    @(190.73, 321.27),
    @(191.55, 315.50),
    @(203.93, 298.16),
    @(173.39, 275.87),
    @(179.17, 270.10),
    @(218.79, 280.00),
    @(246.03, 249.46),
    @(173.39, 193.33),
    @(180.82, 185.90),
    @(279.05, 216.44),
    @(292.26, 204.89),
    @(317.85, 180.95),
    @(340.96, 162.79)
)

$targetDir = "c:\Users\mrodriguez\.gemini\antigravity-ide\scratch\travelone"

foreach ($key in $sizes.Keys) {
    $filename = $key
    $size = $sizes[$key]
    $scale = [double]$size / 512.0

    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Vibrant Emerald Green Gradient Background #0ea35d -> #09874c (100% full bleed, iOS Dark Mode immune)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $colorTop = [System.Drawing.Color]::FromArgb(255, 14, 163, 93)
    $colorBottom = [System.Drawing.Color]::FromArgb(255, 9, 135, 76)
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rect, $colorTop, $colorBottom, 45.0)
    $g.FillRectangle($gradBrush, 0, 0, $size, $size)

    # 2. Subtle soft concentric glow ring
    $cx = 256.0 * $scale
    $cy = 256.0 * $scale
    $r = 195.0 * $scale
    $ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 255, 255, 255)), [float](4.0 * $scale)
    $g.DrawEllipse($ringPen, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))

    # 3. Pure Crisp White Airplane Silhouette with Subtle Drop Shadow
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
    $shadowOffset = 6.0 * $scale
    $shadowPoints = New-Object System.Drawing.PointF[] $rawPoints.Length
    for ($i = 0; $i -lt $rawPoints.Length; $i++) {
        $px = [float]($rawPoints[$i][0] * $scale)
        $py = [float]($rawPoints[$i][1] * $scale + $shadowOffset)
        $shadowPoints[$i] = New-Object System.Drawing.PointF($px, $py)
    }
    $g.FillPolygon($shadowBrush, $shadowPoints)

    # Pure White Jet Silhouette
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $points = New-Object System.Drawing.PointF[] $rawPoints.Length
    for ($i = 0; $i -lt $rawPoints.Length; $i++) {
        $px = [float]($rawPoints[$i][0] * $scale)
        $py = [float]($rawPoints[$i][1] * $scale)
        $points[$i] = New-Object System.Drawing.PointF($px, $py)
    }
    $g.FillPolygon($whiteBrush, $points)

    $g.Flush()
    $outPath = Join-Path $targetDir $filename
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $gradBrush.Dispose()
    $ringPen.Dispose()
    $shadowBrush.Dispose()
    $whiteBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($size x $size)"
}
Write-Host "ALL_GREEN_ICONS_GENERATED_SUCCESSFULLY"
