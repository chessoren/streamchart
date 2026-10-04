# Assembles the StreamChart demo video: real screen captures + motion scenes, Oren's narration
# (Fish Audio), a synthesized ambient score, burned-in English subtitles and chapter titles.
import json, subprocess, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['opening', 'problem', 'idea', 'checkup', 'chart', 'sim', 'reply', 'scale', 'end']
CHAPTERS = {
    'checkup': '1 · The 60-second check-up',
    'chart': '2 · The stream’s chart',
    'sim': '3 · A week in 60 seconds',
    'reply': '4 · The loop closes',
    'scale': '5 · Standards & scale',
}
segs = json.load(open('narration.timed.json'))

def dur(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))

def run(cmd):
    subprocess.run(cmd, check=True)

os.makedirs('build', exist_ok=True)
starts, lengths, t = {}, {}, 0.0
for c in ORDER:
    raw = dur(f'clips/{c}.mp4')
    last = max([s['at'] + s['dur'] for s in segs if s['clip'] == c] + [0])
    D = max(raw, last + (3.0 if c == 'end' else 1.2))
    if c == 'end':
        D = max(D, 11.0)
    pad = max(0.0, D - raw) + 0.1
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'clips/{c}.mp4', '-vf',
         f'tpad=stop_mode=clone:stop_duration={pad:.2f},fps=30,scale=1920:1080,setsar=1,'
         f'fade=t=in:st=0:d=0.35,fade=t=out:st={D - 0.4:.2f}:d=0.4',
         '-t', f'{D:.2f}', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', f'build/{c}.mp4'])
    starts[c], lengths[c] = t, D
    t += D
TOTAL = t
with open('build/list.txt', 'w') as f:
    for c in ORDER:
        f.write(f"file '{c}.mp4'\n")
run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/list.txt', '-c', 'copy', 'build/video.mp4'])

# ---- narration track ----
inputs, filters = [], []
for i, s in enumerate(segs):
    s['abs'] = starts[s['clip']] + s['at']
    inputs += ['-i', f"audio/{s['id']}.mp3"]
    gain = 'volume=0.9,' if s.get('voice') == 'soft' else ''
    filters.append(f"[{i}:a]{gain}aresample=48000,adelay={int(s['abs'] * 1000)}|{int(s['abs'] * 1000)}[n{i}]")
filters.append(''.join(f'[n{i}]' for i in range(len(segs))) + f'amix=inputs={len(segs)}:normalize=0,apad=whole_dur={TOTAL:.2f},atrim=0:{TOTAL:.2f}[voice]')
run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filters), '-map', '[voice]', '-ac', '2', 'build/voice.wav'])

# ---- score: water bed + a soft A-minor pad whose third turns major at the signature, plus a bell ----
SIGN = starts['sim'] + 50.5
pad = (f"0.050*sin(2*PI*110*t)+0.040*sin(2*PI*164.81*t)+0.034*sin(2*PI*220*t)"
       f"+0.028*sin(2*PI*if(gt(t,{SIGN:.2f}),277.18,261.63)*t)+0.018*sin(2*PI*329.63*t)")
lfo = '(0.72+0.28*sin(2*PI*0.07*t))'
run(['ffmpeg', '-y', '-loglevel', 'error',
     '-f', 'lavfi', '-i', f"aevalsrc='({pad})*{lfo}':s=48000:d={TOTAL:.2f}",
     '-f', 'lavfi', '-i', f"anoisesrc=color=pink:amplitude=0.5:sample_rate=48000:d={TOTAL:.2f}",
     '-f', 'lavfi', '-i', f"aevalsrc='0.22*sin(2*PI*880*t)*exp(-2.2*t)+0.12*sin(2*PI*1320*t)*exp(-3*t)':s=48000:d=4",
     '-filter_complex',
     "[0:a]lowpass=f=1400,aecho=0.8:0.7:120|260:0.35|0.25,volume=0.9[padd];"
     "[1:a]highpass=f=180,lowpass=f=1100,volume=0.10,tremolo=f=0.18:d=0.35[water];"
     f"[2:a]aecho=0.8:0.6:180|400:0.4|0.3,adelay={int(SIGN * 1000)}|{int(SIGN * 1000)},volume=0.8[bell];"
     f"[padd][water][bell]amix=inputs=3:normalize=0,afade=t=in:st=0:d=3,afade=t=out:st={TOTAL - 4:.2f}:d=4,atrim=0:{TOTAL:.2f}[m]",
     '-map', '[m]', '-ac', '2', 'build/music.wav'])

# duck the music under the voice; two seconds of near-silence after the stream's own words
QUIET = [s for s in segs if s.get('voice') == 'soft'][0]
q0, q1 = QUIET['abs'] + QUIET['dur'], QUIET['abs'] + QUIET['dur'] + 2.2
run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'build/voice.wav', '-i', 'build/music.wav', '-filter_complex',
     "[0:a]asplit=2[v1][v2];"
     "[1:a][v1]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=500[duck];"
     f"[duck]volume='if(between(t,{q0:.2f},{q1:.2f}),0.15,1)':eval=frame[duck2];"
     "[v2][duck2]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[out]",
     '-map', '[out]', '-ar', '48000', '-ac', '2', 'build/mix.wav'])

# ---- subtitles (ASS) ----
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h}:{m:02d}:{s:05.2f}'

lines = []
for s in segs:
    words = s['text'].split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if (len(' '.join(cur)) > 46 and w[-1] in ',.:;?') or len(' '.join(cur)) > 62:
            chunks.append(' '.join(cur)); cur = []
    if cur:
        chunks.append(' '.join(cur))
    total = sum(len(c) for c in chunks)
    t0 = s['abs']
    for c in chunks:
        d = s['dur'] * len(c) / total
        style = 'Voice' if s.get('voice') == 'soft' else 'Sub'
        text = c.replace('{', '(').replace('}', ')')
        if style == 'Voice':
            text = '“' + text + '”'
        lines.append(f'Dialogue: 0,{ts(t0)},{ts(t0 + d + 0.05)},{style},,0,0,0,,{text}')
        t0 += d
for c, title in CHAPTERS.items():
    a = starts[c] + 0.4
    lines.append(f'Dialogue: 1,{ts(a)},{ts(a + 4.2)},Chapter,,0,0,0,,{{\\fad(300,400)}}{title}')
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter SemiBold,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H9A111A2B,0,0,0,0,100,100,0,0,3,14,0,2,200,200,54,1
Style: Voice,Inter Medium,48,&H00FFE2C9,&H00FFFFFF,&H00000000,&H9A2B1A11,0,1,0,0,100,100,0,0,3,14,0,2,200,200,54,1
Style: Chapter,Inter SemiBold,34,&H00FFFFFF,&H00FFFFFF,&H00F66E3B,&H00F66E3B,0,0,0,0,100,100,0,0,3,16,0,7,365,40,34,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(lines) + '\n'
open('build/subs.ass', 'w').write(ass)

out = 'StreamChart-demo.mp4'
run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'build/video.mp4', '-i', 'build/mix.wav', '-vf', 'ass=build/subs.ass:fontsdir=fonts',
     '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out])
json.dump({'total': TOTAL, 'starts': starts, 'sign': SIGN}, open('build/timeline.json', 'w'), indent=1)
print(f'{out}: {TOTAL:.1f}s')
