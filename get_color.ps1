Add-Type -AssemblyName System.Drawing
$img = new-object System.Drawing.Bitmap "C:\Users\Sivanesan S\.gemini\antigravity-ide\brain\7325292c-82f3-4c05-8570-088005d81d3e\.user_uploaded\media_1786791780924.png"
$pixel = $img.GetPixel(10,10)
Write-Host "Color: R=$($pixel.R) G=$($pixel.G) B=$($pixel.B)"
