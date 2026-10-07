<#
.SYNOPSIS
  Pose Aktum PDF sur un poste ou sur un partage, sans droits d'administrateur, et le retire de la même façon.

.DESCRIPTION
  Aktum PDF est un dossier portable : « déployer », c'est copier ce dossier quelque part et, si on le veut, poser un raccourci. Ce script le fait de
  façon répétable (script de connexion, stratégie de groupe, Intune, ou à la main), et refait la même chose pour une mise à jour.

  Ce qu'il ne fait jamais :
   - toucher au sous-dossier « data » (comptes, tampons, signatures, récents, travail mis de côté) ni à « licence.json » ;
   - écrire dans le registre, dans Program Files, ou demander des droits d'administrateur ;
   - effacer un fichier que la personne a posé elle-même dans le dossier (seul ce que l'archive livre est retiré, par -Retirer).
  Rien n'est envoyé nulle part : le script ne se connecte à aucun réseau.

.PARAMETER Source
  Le dossier décompressé de l'archive (celui qui contient AktumPDF.exe). Par défaut : le dossier de ce script.

.PARAMETER Cible
  Où poser l'application. Par défaut : « %LOCALAPPDATA%\Aktum PDF » (un poste, une personne, aucun droit à demander). Pour un partage :
  « \\serveur\logiciels\AktumPDF » (un seul endroit à mettre à jour ; le dossier « data » y vit alors à côté de l'exécutable).

.PARAMETER Raccourcis
  Pose un raccourci « Aktum PDF » dans le menu Démarrer de la PERSONNE qui lance le script (pas de tout le poste).

.PARAMETER Bureau
  Pose aussi un raccourci sur son Bureau.

.PARAMETER Retirer
  Retire l'application de la cible (les fichiers de l'archive, selon LISTE-DES-FICHIERS.txt) et ses raccourcis. « data » et « licence.json » restent.

.PARAMETER Silencieux
  N'écrit que les erreurs.

.EXAMPLE
  .\Deployer-Aktum-PDF.ps1 -Raccourcis
  Poste par poste : copie dans %LOCALAPPDATA%\Aktum PDF et pose le raccourci du menu Démarrer.

.EXAMPLE
  .\Deployer-Aktum-PDF.ps1 -Cible '\\serveur\logiciels\AktumPDF'
  Un seul dossier pour tout le service ; chaque poste n'a plus qu'un raccourci vers AktumPDF.exe.

.NOTES
  Code de sortie : 0 tout s'est passé ; 1 l'archive n'est pas là ou la copie a échoué. Le journal est écrit dans %TEMP%\aktum-deploiement.log.
  Pour Intune : empaqueter ce dossier avec l'outil « Win32 Content Prep », commande d'installation
  « powershell.exe -NoProfile -ExecutionPolicy Bypass -File Deployer-Aktum-PDF.ps1 -Raccourcis -Silencieux », désinstallation « … -Retirer -Silencieux »,
  règle de détection : le fichier « %LOCALAPPDATA%\Aktum PDF\AktumPDF.exe ». Voir le guide d'administration.
#>
[CmdletBinding()]
param(
  [string]$Source = $PSScriptRoot,
  [string]$Cible = (Join-Path $env:LOCALAPPDATA 'Aktum PDF'),
  [switch]$Raccourcis,
  [switch]$Bureau,
  [switch]$Retirer,
  [switch]$Silencieux
)
$ErrorActionPreference = 'Stop'
$journal = Join-Path $env:TEMP 'aktum-deploiement.log'
function Dire([string]$m) {
  $ligne = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $m
  Add-Content -LiteralPath $journal -Value $ligne -Encoding UTF8
  if (-not $Silencieux) { Write-Host $m }
}
# Ce qui n'appartient pas à l'archive : jamais retiré, jamais écrasé.
$proteges = @('data', 'maj', 'licence.json', 'aktum.log')
function EstProtege([string]$rel) {
  $premier = ($rel -replace '\\', '/').Split('/')[0].ToLowerInvariant()
  return $proteges -contains $premier
}
function Raccourci([string]$chemin, [string]$exe, [string]$dossier) {
  $sh = New-Object -ComObject WScript.Shell
  $l = $sh.CreateShortcut($chemin)
  $l.TargetPath = $exe
  $l.WorkingDirectory = $dossier
  $l.Description = 'Aktum PDF'
  $l.Save()
}
$menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Aktum PDF.lnk'
$bureauLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Aktum PDF.lnk'

try {
  if ($Retirer) {
    Dire "Retrait de Aktum PDF : $Cible"
    $liste = Join-Path $Cible 'LISTE-DES-FICHIERS.txt'
    if (-not (Test-Path -LiteralPath $liste)) { Dire "Pas de LISTE-DES-FICHIERS.txt dans $Cible : rien n'est retiré (ce dossier n'a pas été posé par ce script, ou par une version qui ne livrait pas de liste)."; exit 0 }
    $racine = (Resolve-Path -LiteralPath $Cible).Path.TrimEnd('\')
    $retires = 0
    foreach ($rel in (Get-Content -LiteralPath $liste -Encoding UTF8)) {
      $rel = $rel.Trim()
      if (-not $rel -or $rel -match '(^/)|(\\)|(:)|(^|/)\.\.?(/|$)' -or (EstProtege $rel)) { continue }
      $f = Join-Path $racine ($rel -replace '/', '\')
      $res = [IO.Path]::GetFullPath($f)
      if (-not $res.StartsWith($racine + '\', [StringComparison]::OrdinalIgnoreCase)) { continue }
      if (Test-Path -LiteralPath $res -PathType Leaf) { Remove-Item -LiteralPath $res -Force -ErrorAction SilentlyContinue; $retires++ }
    }
    # les dossiers que le retrait a vidés, du plus profond au plus haut ; « data » reste, donc le dossier de l'application aussi s'il en contient
    Get-ChildItem -LiteralPath $racine -Directory -Recurse -ErrorAction SilentlyContinue | Sort-Object { $_.FullName.Length } -Descending |
      ForEach-Object { if (-not (Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue } }
    Remove-Item -LiteralPath $liste -Force -ErrorAction SilentlyContinue
    foreach ($l in @($menu, $bureauLnk)) { if (Test-Path -LiteralPath $l) { Remove-Item -LiteralPath $l -Force } }
    if (-not (Get-ChildItem -LiteralPath $racine -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $racine -Force -ErrorAction SilentlyContinue }
    Dire "$retires fichier(s) retiré(s). Les données (dossier « data », licence.json) sont conservées."
    exit 0
  }

  $exeSource = Join-Path $Source 'AktumPDF.exe'
  if (-not (Test-Path -LiteralPath $exeSource)) { Dire "AktumPDF.exe est introuvable dans $Source : indiquez le dossier décompressé de l'archive avec -Source."; exit 1 }
  $sourceComplete = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\')
  New-Item -ItemType Directory -Force -Path $Cible | Out-Null
  $cibleComplete = (Resolve-Path -LiteralPath $Cible).Path.TrimEnd('\')
  if ($sourceComplete -ieq $cibleComplete) { Dire 'La source et la cible sont le même dossier : rien à copier.'; }
  else {
    Dire "Pose de Aktum PDF : $sourceComplete -> $cibleComplete"
    # Pas de /MIR : robocopy recopie et remplace, n'efface rien. « data » est exclu dans les deux sens.
    & robocopy.exe $sourceComplete $cibleComplete /E /XD data maj /XF licence.json aktum.log /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Dire "La copie a échoué (robocopy : $LASTEXITCODE)."; exit 1 }
    # Le ménage de ce que la version précédente livrait et que celle-ci ne livre plus se fait par le script de mise à jour (Mettre-a-jour.cmd) ;
    # ici, une nouvelle pose recouvre l'ancienne.
  }
  $exe = Join-Path $cibleComplete 'AktumPDF.exe'
  if ($Raccourcis) { Raccourci $menu $exe $cibleComplete; Dire "Raccourci : $menu" }
  if ($Bureau) { Raccourci $bureauLnk $exe $cibleComplete; Dire "Raccourci : $bureauLnk" }
  Dire "Terminé. Lancez : $exe"
  exit 0
}
catch {
  Dire "Échec : $($_.Exception.Message)"
  exit 1
}
