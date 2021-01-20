@set PATH=%PATH%;C:\Windows\Microsoft.NET\Framework\v4.0.30319

@set win_dst=rsrcs\trayicon.exe

del %win_dst%

@set csc=Csc.exe
@set args=/noconfig /nowarn:1701,1702 /nostdlib+ /errorreport:prompt /warn:0  /errorendlocation /preferreduilang:en-US /highentropyva- /reference:C:\Windows\Microsoft.NET\Framework\v2.0.50727\mscorlib.dll /reference:C:\Windows\Microsoft.NET\Framework\v2.0.50727\System.dll /reference:C:\Windows\Microsoft.NET\Framework\v2.0.50727\System.Xml.dll /reference:C:\Windows\Microsoft.NET\Framework\v2.0.50727\System.Drawing.dll /reference:C:\Windows\Microsoft.NET\Framework\v2.0.50727\System.Windows.Forms.dll /filealign:512 /utf8output

@set files=src\Program.cs src\Properties\AssemblyInfo.cs src\ProcessExtensions.cs src\Utils\Kernel32.cs


%csc%  %args% /platform:x86 /out:%win_dst%  /target:winexe %files%




