# Get the desired new filenames
$newNames = Get-Content -Path ".\filenames.txt"

# Get all .wav files in the current folder, sorted alphabetically
$files = Get-ChildItem -Filter *.wav | Sort-Object Name

# Check if count matches
if ($files.Count -ne $newNames.Count) {
    Write-Host "❌ Mismatch! Found $($files.Count) .wav files and $($newNames.Count) new names."
    exit 1
}

# Rename each file
for ($i = 0; $i -lt $files.Count; $i++) {
    $oldFile = $files[$i]
    $newName = "$($newNames[$i]).wav"
    
    Write-Host "🔄 Renaming '$($oldFile.Name)' → '$newName'"
    Rename-Item -Path $oldFile.FullName -NewName $newName
}

Write-Host "All files renamed successfully."
