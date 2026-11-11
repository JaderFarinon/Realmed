param([string]$Username='', [string]$Release='current')
$ErrorActionPreference='Stop'
if($Release -notmatch '^(current|[0-9]{8}-[0-9]{6})$'){throw 'Invalid Realmed release'}
$taskRemoteRoot=if($Release -eq 'current'){'/qyvia/realmed/current'}else{"/qyvia/realmed/releases/$Release"}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskForm=New-Object System.Windows.Forms.Form
$taskForm.Text='Realmed — Conta exclusiva da coleta Stenci'
$taskForm.Size=New-Object System.Drawing.Size(510,285)
$taskForm.StartPosition='CenterScreen'
$taskForm.FormBorderStyle='FixedDialog'
$taskForm.MaximizeBox=$false
$taskForm.TopMost=$true
$taskForm.Add_Shown({
  $taskForm.Activate()
  $taskPass.Focus()
  [IO.File]::WriteAllText((Join-Path $taskRoot '.deployment/billing-dialog-status.txt'),'OPEN '+[DateTime]::UtcNow.ToString('o'))
})
$taskInfo=New-Object System.Windows.Forms.Label
$taskInfo.Text='Informe a conta exclusiva. A senha será validada pelo Stenci e guardada criptografada no servidor Realmed.'
$taskInfo.SetBounds(20,15,455,45)
$taskUserLabel=New-Object System.Windows.Forms.Label
$taskUserLabel.Text='Usuário Stenci (CPF)'
$taskUserLabel.SetBounds(20,65,180,20)
$taskUser=New-Object System.Windows.Forms.TextBox
$taskUser.Text=$Username
$taskUser.SetBounds(20,88,450,26)
$taskPassLabel=New-Object System.Windows.Forms.Label
$taskPassLabel.Text='Senha Stenci'
$taskPassLabel.SetBounds(20,122,180,20)
$taskPass=New-Object System.Windows.Forms.TextBox
$taskPass.UseSystemPasswordChar=$true
$taskPass.SetBounds(20,145,450,26)
$taskButton=New-Object System.Windows.Forms.Button
$taskButton.Text='Validar e configurar'
$taskButton.SetBounds(275,190,195,32)
$taskStatus=Join-Path $taskRoot '.deployment/billing-credentials-status.txt'
$taskButton.Add_Click({
  if([string]::IsNullOrWhiteSpace($taskUser.Text) -or $taskPass.Text.Length -eq 0){return}
  $taskButton.Enabled=$false
  $taskInfo.Text='Validando a conta e encerrando a sessão Stenci…'
  $taskForm.Refresh()
  $taskPayload=$null
  $taskFailureCode='TRANSPORT_OR_SETUP'
  try {
    $taskStart=New-Object System.Diagnostics.ProcessStartInfo
    $taskStart.FileName='C:\Users\jader\AppData\Local\Microsoft\WinGet\Packages\PuTTY.PuTTY_Microsoft.Winget.Source_8wekyb3d8bbwe\PLINK.EXE'
    $taskStart.Arguments='-batch -agent -T -ssh -P 3022 225881-2628@gate.paas.saveincloud.net.br "cd '+$taskRemoteRoot+'/backend && node ../deploy/configure-billing-collector.cjs"'
    $taskStart.UseShellExecute=$false
    $taskStart.CreateNoWindow=$true
    $taskStart.RedirectStandardInput=$true
    $taskStart.RedirectStandardOutput=$true
    $taskStart.RedirectStandardError=$true
    $taskProcess=New-Object System.Diagnostics.Process
    $taskProcess.StartInfo=$taskStart
    [void]$taskProcess.Start()
    $taskOutput=$taskProcess.StandardOutput.ReadToEndAsync()
    $taskErrors=$taskProcess.StandardError.ReadToEndAsync()
    $taskPayload=@{username=$taskUser.Text.Trim();password=$taskPass.Text}|ConvertTo-Json -Compress
    $taskProcess.StandardInput.Write($taskPayload)
    $taskProcess.StandardInput.Close()
    $taskPayload=$null
    $taskPass.Clear()
    if(-not $taskProcess.WaitForExit(90000)){$taskProcess.Kill();throw 'Timeout'}
    if($taskProcess.ExitCode -eq 0 -and $taskOutput.Result.Contains('COLLECTOR_CREDENTIALS_CONFIGURED')){
      [IO.File]::WriteAllText($taskStatus,'CONFIGURED '+[DateTime]::UtcNow.ToString('o'))
      [void][System.Windows.Forms.MessageBox]::Show('Conta configurada. A sessão Stenci foi encerrada e a coleta automática poderá iniciar.','Realmed')
      $taskForm.Close()
    }else{
      if($taskErrors.Result -match 'COLLECTOR_SETUP_FAILED ([A-Z0-9_]+)'){$taskFailureCode=$Matches[1]}
      throw 'Validation failed'
    }
  }catch{
    [IO.File]::WriteAllText($taskStatus,'SETUP_FAILED '+$taskFailureCode+' '+[DateTime]::UtcNow.ToString('o'))
    $taskInfo.Text='Não foi possível validar/configurar ('+$taskFailureCode+'). Confira a senha, as permissões da conta e a chave SSH no Pageant.'
    $taskPass.Clear()
    $taskButton.Enabled=$true
  }finally{$taskPayload=$null}
})
$taskForm.Controls.AddRange(@($taskInfo,$taskUserLabel,$taskUser,$taskPassLabel,$taskPass,$taskButton))
$taskForm.AcceptButton=$taskButton
[void]$taskForm.ShowDialog()
$taskPass.Clear()
$taskForm.Dispose()
