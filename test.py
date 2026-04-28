from pathlib import Path
p=Path('/mnt/data/v7/app.js')
print('read')
s=p.read_text()
print(len(s))
s=s.replace('abc','def')
print('write')
p.write_text(s)
print('done')
