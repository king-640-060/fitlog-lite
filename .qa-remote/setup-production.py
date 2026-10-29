from pathlib import Path
import tarfile,json,hashlib,subprocess
r=Path.cwd();p=r/'.qa-remote'
for name,d in [('actual-app',r/'dist'),('start-app',p/'start-client/dist'),('old-v7',p/'old-v7/dist')]:
 d.mkdir(parents=True,exist_ok=True)
 if name=='actual-app':
  import shutil
  shutil.rmtree(d);d.mkdir()
 with tarfile.open(p/(name+'.tgz'))as t:t.extractall(d,filter='data')
source={str(f.relative_to(r)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sorted((r/'src').rglob('*'))if f.is_file()}
assert source==json.loads((p/'expected-source.json').read_text())
(p/'source-manifest.json').write_text(json.dumps(source,indent=2))
(p/'runner.txt').write_text(subprocess.check_output(['sw_vers'],text=True)+subprocess.check_output(['node','--version'],text=True))
info=json.loads((r/'dist/build-info.json').read_text());assert info['build']=='0af60a6d1969c7fbf8eed1b035d92a333fb51e48'and not info['local']
