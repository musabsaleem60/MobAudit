# MobAudit Platform Startup Script for Windows (PowerShell)
# ─────────────────────────────────────────────────────────────

$cyan = "[36m"
$green = "[32m"
$yellow = "[33m"
$red = "[31m"
$nc = "[0m"

# Helper to write colored messages
function Write-Color ($message, $color) {
    Write-Host -NoNewline "$([char]27)$color"
    Write-Host $message
    Write-Host -NoNewline "$([char]27)$nc"
}

Clear-Host
Write-Color "" $cyan
Write-Color "  ███╗   ███╗ ██████╗ ██████╗  █████╗ ██╗   ██╗██████╗ ██╗████████╗" $cyan
Write-Color "  ████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝" $cyan
Write-Color "  ██╔████╔██║██║   ██║██████╔╝███████║██║   ██║██║  ██║██║   ██║   " $cyan
Write-Color "  ██║╚██╔╝██║██║   ██║██╔══██╗██╔══██║██║   ██║██║  ██║██║   ██║   " $cyan
Write-Color "  ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║  ██║╚██████╔╝██████╔╝██║   ██║   " $cyan
Write-Color "  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝   " $cyan
Write-Color "" $cyan
Write-Color "  Mobile Security Platform Startup (Windows)" $cyan
Write-Color "  ──────────────────────────────────────────────" $cyan
Write-Color "" $cyan

# ──────────────────────────────────────────────
# 0. Clean up stale processes
# ──────────────────────────────────────────────
Write-Color "[0/4] 🧹 Cleaning up stale processes..." $cyan

# Stop any processes using port 5001 or 3000
$ports = @(5001, 3000)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($proc) {
        $pids = $proc.OwningProcess | Select-Object -Unique
        foreach ($pid in $pids) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}
Write-Color "      ✅ Cleanup complete" $green
Write-Color "" $cyan

# ──────────────────────────────────────────────
# 1. Manage Containers
# ──────────────────────────────────────────────
Write-Color "[1/4] 📦 Managing Docker containers..." $cyan

# Start MongoDB container if stopped, create if not exists
$mongoRunning = docker ps -q --filter "name=^mobaudit-mongo$" --filter "status=running"
$mongoExists = docker ps -aq --filter "name=^mobaudit-mongo$"

if ($mongoRunning) {
    Write-Color "      ✅ MongoDB container is already running" $green
} elseif ($mongoExists) {
    Write-Color "      🔄 Starting stopped MongoDB container..." $yellow
    docker start mobaudit-mongo > $null
    Write-Color "      ✅ MongoDB container started" $green
} else {
    Write-Color "      🚀 Creating new MongoDB container..." $yellow
    docker run -d --name mobaudit-mongo -p 27017:27017 mongo:latest > $null
    Write-Color "      ✅ MongoDB container created" $green
}

# Start MobSF container if stopped, create if not exists
$mobsfRunning = docker ps -q --filter "name=^mobsf$" --filter "status=running"
$mobsfExists = docker ps -aq --filter "name=^mobsf$"

if ($mobsfRunning) {
    Write-Color "      ✅ MobSF container is already running" $green
} elseif ($mobsfExists) {
    Write-Color "      🔄 Starting stopped MobSF container..." $yellow
    docker start mobsf > $null
    Write-Color "      ✅ MobSF container started" $green
} else {
    Write-Color "      🚀 Creating new MobSF container..." $yellow
    docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest > $null
    Write-Color "      ✅ MobSF container created" $green
}
Write-Color "" $cyan

# ──────────────────────────────────────────────
# 2. Wait for MobSF to be ready
# ──────────────────────────────────────────────
Write-Color "[2/4] ⏳ Waiting for MobSF to be ready..." $cyan
$retries = 0
$maxRetries = 40
$ready = $false

while (-not $ready -and $retries -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api_docs" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        $retries++
        Write-Host -NoNewline "      Waiting for MobSF... ($retries/$maxRetries)`r"
        Start-Sleep -Seconds 3
    }
}

if ($ready) {
    Write-Color "      ✅ MobSF is ready!                        " $green
} else {
    Write-Color "      ⚠️  MobSF didn't respond in time — continuing anyway" $yellow
}
Write-Color "" $cyan

# ──────────────────────────────────────────────
# 3. Sync MobSF API Key → .env
# ──────────────────────────────────────────────
Write-Color "[3/4] 🔑 Syncing MobSF API key..." $cyan
$mobsfLogs = docker logs mobsf 2>&1
$apiKeyLine = $mobsfLogs | Select-String "REST API Key" | Select-Object -Last 1

if ($apiKeyLine) {
    # Extract API Key (matches 64 characters hex)
    if ($apiKeyLine -match '([a-f0-9]{64})') {
        $apiKey = $Matches[1]
        
        $envPath = Join-Path $PSScriptRoot "server\.env"
        if (Test-Path $envPath) {
            $envContent = Get-Content $envPath
            $newContent = @()
            $keyFound = $false
            
            foreach ($line in $envContent) {
                if ($line -like "MOBSF_API_KEY=*") {
                    $newContent += "MOBSF_API_KEY=$apiKey"
                    $keyFound = $true
                } else {
                    $newContent += $line
                }
            }
            
            if (-not $keyFound) {
                $newContent += "MOBSF_API_KEY=$apiKey"
            }
            
            $newContent | Set-Content $envPath
            Write-Color "      ✅ API key synced from logs! ($apiKey)" $green
        } else {
            Write-Color "      ⚠️  server/.env file not found" $yellow
        }
    } else {
        Write-Color "      ⚠️  Could not extract API key format from logs" $yellow
    }
} else {
    Write-Color "      ⚠️  Could not find REST API Key in logs" $yellow
}
Write-Color "" $cyan

# ──────────────────────────────────────────────
# 4. Start Server and Client
# ──────────────────────────────────────────────
Write-Color "[4/4] 🚀 Starting MobAudit services..." $cyan
Write-Color "" $cyan

# Run backend server in a separate background job/process
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory (Join-Path $PSScriptRoot "server") -PassThru -NoNewWindow

# Wait 2 seconds for server initialization
Start-Sleep -Seconds 2

# Run frontend client
$clientProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory (Join-Path $PSScriptRoot "client") -PassThru -NoNewWindow

Write-Color "  ──────────────────────────────────────────────" $cyan
Write-Color "  ✅ MobAudit is launching!" $green
Write-Color "" $cyan
Write-Color "  🖥️  Backend  → http://127.0.0.1:5001" $cyan
Write-Color "  🌐 Frontend → http://127.0.0.1:3000" $cyan
Write-Color "  🔍 MobSF    → http://127.0.0.1:8000" $cyan
Write-Color "" $cyan
Write-Color "  Keeping this window open to monitor. Press Ctrl+C or close to stop." $yellow
Write-Color "  ──────────────────────────────────────────────" $cyan
Write-Color "" $cyan

# Wait for processes
try {
    Wait-Process -Id $serverProcess.Id, $clientProcess.Id -ErrorAction SilentlyContinue
} catch {
    # If interrupted
    Write-Color "🛑 Stopping MobAudit services..." $yellow
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $clientProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Color "✅ All services stopped." $green
}
