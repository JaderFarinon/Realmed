"""Copy only referenced JPEG/PNG assets from the supplied ZIP; no image edits."""
import argparse, hashlib, io, json, pathlib, stat, zipfile
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--snapshot',required=True)
parser.add_argument('--zip',required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args()
snapshot=json.loads(pathlib.Path(args.snapshot).read_text(encoding='utf-8'))
out=pathlib.Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.zip) as archive:
    if len(archive.infolist())>5000 or sum(item.file_size for item in archive.infolist())>300*1024*1024:
        raise ValueError('ZIP exceeds the migration limits')
    index={}
    for item in archive.infolist():
        if item.is_dir():continue
        basename=pathlib.PurePosixPath(item.filename.replace('\\','/')).name
        index.setdefault(basename,[]).append(item)
    manifest={};missing=[]
    for product in snapshot['data']['produto']:
        original=product.get('foto')
        if not original:continue
        basename=pathlib.PurePosixPath(original.replace('\\','/')).name
        entries=index.get(basename,[])
        if not entries:missing.append(product['id_produto']);continue
        if len(entries)!=1:raise ValueError('Ambiguous ZIP asset: '+basename)
        item=entries[0]
        if stat.S_ISLNK(item.external_attr>>16) or item.file_size>2*1024*1024:raise ValueError('Unsafe or oversized photo: '+basename)
        content=archive.read(item)
        with Image.open(io.BytesIO(content)) as photo:
            if photo.format not in ['JPEG','PNG'] or max(photo.size)>4096:raise ValueError('Invalid product photo: '+basename)
            extension='.jpg' if photo.format=='JPEG' else '.png'
            photo.verify()
        sha=hashlib.sha256(content).hexdigest();filename=sha+extension
        target=out/filename
        if target.exists() and target.read_bytes()!=content:raise ValueError('Asset collision')
        target.write_bytes(content)
        manifest[str(product['id_produto'])]={'filename':filename,'sha256':sha,'originalName':basename,'bytes':len(content)}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'referenced':len(manifest)+len(missing),'prepared':len(manifest),'missingProductIds':missing,'output':str(out)},ensure_ascii=False))
