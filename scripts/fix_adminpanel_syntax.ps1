# Fix AdminPanel.tsx JSX syntax
$file = "i:\Antigravity\finos---premium-financial-operating-system\components\AdminPanel.tsx"
$content = Get-Content $file -Raw

# Fix 1: Remove extra space in comment
$content = $content -replace '\{/\* Confirmation Modal for Global Data Repair \*/ \}', '{/* Confirmation Modal for Global Data Repair */}'

# Fix 2: Add proper indentation to ConfirmModal
$content = $content -replace '(\r?\n)<ConfirmModal', '$1    <ConfirmModal'

# Fix 3: Remove extra space in closing div
$content = $content -replace '</div >', '</div>'

# Save the file
Set-Content $file -Value $content -NoNewline

Write-Host "✅ Fixed AdminPanel.tsx syntax errors"
