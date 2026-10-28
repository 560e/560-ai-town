Add-Type -AssemblyName System.Drawing
$taskText = '图馆讲堂生校公告牌智慧页坊智汇五六零启新境梦起北部湾创未来服教五六零人工智能AI小镇学院创业园商业街社区广场政务大厅任务学习挑战活动中心数字作品咖啡工具书屋灵感衣橱影像工作室客好物设计商店硬件号楼创作?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
$taskFont = New-Object System.Drawing.FontFamily('Noto Sans SC')
$glyphData = New-Object 'System.Collections.Generic.Dictionary[string,object]' ([System.StringComparer]::Ordinal)
foreach ($taskChar in ($taskText.ToCharArray() | Select-Object -Unique)) {
  $taskPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $taskPath.AddString([string]$taskChar, $taskFont, [int][System.Drawing.FontStyle]::Bold, 160, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
  $taskPoints=$taskPath.PathPoints; $taskTypes=$taskPath.PathTypes; $commands=@(); $j=0
  while ($j -lt $taskPoints.Length) {
    $kind=$taskTypes[$j] -band 7
    if ($kind -eq 0) { $commands+=,@('M',[math]::Round($taskPoints[$j].X,2),[math]::Round(-$taskPoints[$j].Y,2)) }
    elseif ($kind -eq 1) { $commands+=,@('L',[math]::Round($taskPoints[$j].X,2),[math]::Round(-$taskPoints[$j].Y,2)) }
    elseif ($kind -eq 3) {
      $commands+=,@('C',[math]::Round($taskPoints[$j].X,2),[math]::Round(-$taskPoints[$j].Y,2),[math]::Round($taskPoints[$j+1].X,2),[math]::Round(-$taskPoints[$j+1].Y,2),[math]::Round($taskPoints[$j+2].X,2),[math]::Round(-$taskPoints[$j+2].Y,2))
      $j+=2
    }
    if (($taskTypes[$j] -band 128) -ne 0) { $commands+=,@('Z') }
    $j++
  }
  $taskBounds=$taskPath.GetBounds()
  $glyphData[[string]$taskChar]=@{commands=$commands;advance=[math]::Max($taskBounds.Right+8,64)}
  $taskPath.Dispose()
}
$taskFont.Dispose()
$glyphData | ConvertTo-Json -Depth 6 -Compress | Set-Content -LiteralPath 'data/sign-glyphs.json' -Encoding utf8
