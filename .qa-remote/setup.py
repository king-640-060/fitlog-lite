from pathlib import Path
import subprocess,tarfile,hashlib,json
r=Path.cwd();q=r/'.qa-remote'
for name in ['v13','v14']:
 target=q/name;target.mkdir(exist_ok=True)
 with tarfile.open(q/(name+'.tgz')) as t:t.extractall(target,filter='data')
site=q/'site';site.mkdir(exist_ok=True);(site/'fitlog-lite').symlink_to(r/'dist',target_is_directory=True)
for port,base in [(5459,site),(5443,r),(5456,q/'v13'),(5450,q/'v14')]:
 log=(q/('server-'+str(port)+'.txt')).open('w');subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1','--directory',str(base)],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
source={str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((r/'src').rglob('*')) if p.is_file()}
(q/'source-manifest.json').write_text(json.dumps(source,indent=2))

import time,urllib.request
for port,base in [(5459,site),(5443,r),(5456,q/'v13'),(5450,q/'v14')]:
 url='http://127.0.0.1:'+str(port)+('/AGENTS.md' if port==5443 else '/fitlog-lite/')
 for attempt in range(100):
  try:
   with urllib.request.urlopen(url,timeout=2) as response: assert response.status==200
   break
  except Exception:
   if attempt==99: raise
   time.sleep(.1)

with tarfile.open(w/'start.tgz') as t:t.extractall(w/'start')
subprocess.Popen(['python3','-m','http.server','5441','--bind','127.0.0.1','--directory',str(w/'start')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
