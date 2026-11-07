#Requires -Version 7.0
<#
.SYNOPSIS
    THE ALLOWLIST: the single definition of what a deployment package contains.

.DESCRIPTION
    Dot-sourced by build-package.ps1 and verify-package.ps1. It is not runnable on
    its own and produces no output.

    ⚠️ This is an ALLOWLIST and must never become a denylist. docs-and-tools/ holds
    kata-api-key.txt, so a denylist with one missing entry publishes a live API key.
    A file ships only if a rule here says it does.

    ⚠️ EDIT THIS FILE AND NOTHING ELSE when what ships changes. The builder and the
    verifier both read it, which is what stops a package from being built to one
    definition and checked against another.

        build-package.ps1   — copies exactly the files Test-Ships accepts
        verify-package.ps1  — asserts the package IS exactly those files

    This file never ships: docs-and-tools/ is excluded wholesale, and *.ps1 twice over.

.NOTES
    methodica-math-percent-06 — copied from methodica-math-percent-08 (5fe4b78), itself from
    methodica-math-ratio-01 (35648a6). Changed: $ComponentGlob (this unit only); unit-css/ and
    unit-assets/ ship (the Phase 1 shared CSS, motion engine and hint graphics); the dev-only
    navigator (dev-nav.js / dev-nav.css) and the repo-only folders references/, translation/,
    .agents/ never ship.

    It ships NO root files (rule set 28.09.26 for all 720 units; first applied in
    methodica-ar-math-ratio-01 4458f2f). Platforms launch every component by its own
    .../<component>/index.html link — Kata's hostedContentRef — so a unit-level entry point is
    never used. The root index.html stays in the repo for local browsing only.
#>

# ── Directories that never contribute a single file, whatever is inside them ──
$ExcludeTopLevel = @('_test', 'docs-and-tools', 'metadata-from', '.git', '.claude',
                     'references', 'translation', '.agents')   # production references, XLIFF, agent skills

# ── File names that never ship, wherever they appear ──
$ExcludeNames = @('index_dev.html', 'README.md', '.gitignore', '.gitattributes', '.DS_Store',
                  # the per-component dev navigator (index_dev.html's script + styles)
                  'dev-nav.js', 'dev-nav.css')

# ── Extensions that never ship ──
$ExcludeExt = @('.ps1', '.log')

# ── Any path segment starting with an underscore is a SOURCE, not a deliverable.
#    _test/ and assets/video/_source-originals/ both use this convention. ──
$ExcludeUnderscoreSegment = $true

# ── What each shipped area contributes ──
$RootFiles = @()                         # none — the root index.html is not deployed (see .NOTES)

$UnitDirs = @{
    'metadata'    = '*.json'             # unit + per-component catalogue records
    'unit-js'     = '*.js'               # the shared layer (its README.md and dev-nav.js excluded above)
    'unit-css'    = '*.css'              # base / questions / motion / 25-report (dev-nav.css excluded above)
    'unit-assets' = '*'                  # shared media (hint/*.svg), at any depth
}

# Inside a component folder: these files, plus everything under assets/.
$ComponentFiles = @('index.html', 'script.js', 'styles.css')
$ComponentGlob  = 'methodica-math-percent-06-[0-9][0-9]'

# ── Hygiene: if any of these turn up INSIDE a package, it is unsafe to upload ──
$SecretPatterns = @('*key*', '*.ps1', '*.log', 'index_dev.html', 'README.md', '.git*', '_*', 'dev-nav.*')

# ── Files a package may contain that are NOT copied from the tree ──
$PackageOnlyFiles = @('DEPLOY.md')

<#
.SYNOPSIS
    Does this repo-relative path (forward slashes) belong in a deployment package?
#>
function Test-Ships([string] $rel) {
    $segs = $rel.Split('/')
    if ($segs[0] -in $ExcludeTopLevel)                 { return $false }
    if ($segs[-1] -in $ExcludeNames)                   { return $false }
    if ([IO.Path]::GetExtension($rel) -in $ExcludeExt) { return $false }
    if ($ExcludeUnderscoreSegment -and ($segs | Where-Object { $_.StartsWith('_') })) { return $false }

    if ($segs.Count -eq 1) { return $segs[0] -in $RootFiles }

    if ($UnitDirs.ContainsKey($segs[0])) {
        $glob = $UnitDirs[$segs[0]]
        if ($glob -eq '*') { return $true }              # unit-assets/: everything, at any depth
        return ($segs.Count -eq 2 -and $segs[1] -like $glob)
    }

    if ($segs[0] -like $ComponentGlob) {
        if ($segs.Count -eq 2) { return $segs[1] -in $ComponentFiles }
        return ($segs[1] -eq 'assets')                   # assets/ at any depth
    }
    return $false
}

<#
.SYNOPSIS
    Every repo-relative path in $root that ships, sorted.
#>
function Get-ShippableFiles([string] $root) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/') } |
        Where-Object { Test-Ships $_ } |
        Sort-Object
}

<#
.SYNOPSIS
    Secret/dev files present in a package. Anything returned makes it unsafe to upload.
#>
function Get-HygieneHits([string[]] $rels) {
    $hits = @()
    foreach ($pat in $SecretPatterns) {
        $hits += @($rels | Where-Object {
            $_.Split('/')[-1] -like $pat -or ($_.Split('/') | Where-Object { $_ -like $pat })
        })
    }
    @($hits | Sort-Object -Unique | Where-Object { $_ -notin $PackageOnlyFiles })
}
