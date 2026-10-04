# Generates each narration line with Fish Audio (model s2.1-pro-free, Oren's cloned voice).
import json, os, subprocess, concurrent.futures, urllib.request
KEY = [l.split('=',1)[1].strip() for l in open('/tmp/claude-0/-home-user-streamchart/62bba856-abbf-59bb-8630-bd3a61e40788/scratchpad/keys.env') if l.startswith('FISH_API_KEY')][0]
VOICE = os.environ.get('VOICE', 'ec85b2a744494fd8a12671adb1b17f95')
segs = json.load(open('narration.json'))
def gen(s):
    out = f"audio/{s['id']}.mp3"
    if os.path.exists(out) and os.path.getsize(out) > 2000: return out
    body = json.dumps({"text": s['text'], "reference_id": VOICE, "format": "mp3", "mp3_bitrate": 192, "normalize": True, "latency": "normal"}).encode()
    req = urllib.request.Request('https://api.fish.audio/v1/tts', data=body, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'model': 's2.1-pro-free'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r: open(out, 'wb').write(r.read()); return out
        except Exception as e: err = e
    raise RuntimeError(f"{s['id']}: {err}")
with concurrent.futures.ThreadPoolExecutor(4) as ex:
    for f in ex.map(gen, segs): pass
for s in segs:
    d = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f"audio/{s['id']}.mp3"]))
    s['dur'] = round(d, 2)
    print(s['id'], s['clip'], s['at'], s['dur'], 'end', round(s['at']+d, 2))
json.dump(segs, open('narration.timed.json','w'), indent=1)
