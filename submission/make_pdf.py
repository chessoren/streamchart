# Builds the submission PDF: cover, Devpost fields, the full "About the project", slides and screenshots.
import markdown, re, os, subprocess, glob
os.chdir(os.path.dirname(os.path.abspath(__file__)))
about = open('ABOUT.md').read()
about = re.sub(r'^# StreamChart\n', '', about)
about_html = markdown.markdown(about, extensions=['tables'])
sub = open('SUBMISSION.md').read()
tags = re.findall(r'^\d+\. (.+)$', sub, re.M)
slides = sorted(glob.glob('slides/slide-*.png'))
shots = sorted(glob.glob('screenshots/*.png'))
cap = lambda p: os.path.basename(p)[3:-4].replace('-', ' ').capitalize()
html = f"""<!doctype html><html><head><meta charset="utf-8"><title>StreamChart — Devpost submission</title><style>
@font-face{{font-family:Inter;src:url(brand/inter.woff2) format('woff2');font-weight:100 900}}
@page{{size:A4;margin:16mm 16mm 18mm}}
body{{font-family:Inter,sans-serif;color:#1b2333;font-size:10.5pt;line-height:1.55}}
h1{{font-size:30pt;letter-spacing:-.03em;margin:0}} h2{{font-size:16pt;color:#111a2b;margin:22pt 0 6pt;letter-spacing:-.02em}} h3{{font-size:12pt;margin:14pt 0 4pt;color:#111a2b}}
.cover{{height:250mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}}
.cover img{{width:60mm;border-radius:50%}}
.tag{{display:inline-block;background:#e8efff;color:#3b6ef6;border-radius:6px;padding:1pt 6pt;margin:2pt;font-size:9pt;font-weight:600}}
table{{border-collapse:collapse;width:100%;font-size:9.5pt;margin:6pt 0}} td,th{{border-bottom:1px solid #e2e8f1;padding:4pt 6pt;text-align:left;vertical-align:top}} th{{color:#6b778c;font-weight:600}}
.box{{background:#f4f7fb;border:1px solid #e2e8f1;border-radius:8pt;padding:10pt 12pt;margin:8pt 0}}
a{{color:#3b6ef6;text-decoration:none}} .k{{color:#6b778c;font-size:9pt;text-transform:uppercase;letter-spacing:.08em;font-weight:600}}
.pb{{page-break-before:always}} img.full{{width:100%;border-radius:6pt;border:1px solid #e2e8f1;margin:6pt 0 2pt}} .cap{{font-size:8.5pt;color:#6b778c;margin-bottom:10pt}}
blockquote{{margin:6pt 0;padding:6pt 12pt;border-left:3pt solid #3b6ef6;background:#f4f7fb}}
</style></head><body>
<div class="cover">
<img src="logo/streamchart-logo-1024.png">
<div class="k" style="margin-top:14mm">OneAquaHealth IEEE Global Hackathon 2026 · Track 7 Digital Health Standards</div>
<h1 style="font-size:44pt;margin-top:4mm">StreamChart</h1>
<p style="font-size:18pt;color:#3b6ef6;margin:4mm 0">Every patient has a chart. Now every stream does.</p>
<p style="font-size:11pt;color:#56627a;max-width:150mm">A 60-second citizen check-up, a sealed AI second look, confidence grades, a care plan signed by an ecologist, and a reply. In FHIR R4.</p>
<p style="margin-top:10mm">Live app: <a href="https://streamchart-oneaquahealth.netlify.app">streamchart-oneaquahealth.netlify.app</a><br>Code: <a href="https://github.com/chessoren/streamchart">github.com/chessoren/streamchart</a></p>
</div>
<h2>Submission fields</h2>
<div class="box"><b>Project name</b><br>StreamChart</div>
<div class="box"><b>Elevator pitch</b><br>Every patient has a chart. Now every stream does: a 60-second citizen check-up, a sealed AI second look, confidence grades, a care plan signed by an ecologist, and a reply. In FHIR R4.</div>
<div class="box"><b>Track</b><br>Track 7 — Digital Health Standards (also covers Tracks 3, 2, 5, 4 and 6).</div>
<div class="box"><b>Built with</b><br>{''.join(f'<span class="tag">{t}</span>' for t in tags)}</div>
<div class="box"><b>Try it out</b><br>
Live app — <a href="https://streamchart-oneaquahealth.netlify.app">https://streamchart-oneaquahealth.netlify.app</a><br>
Source code — <a href="https://github.com/chessoren/streamchart">https://github.com/chessoren/streamchart</a><br>
Emergency scene — <a href="https://streamchart-oneaquahealth.netlify.app/#/simulation">https://streamchart-oneaquahealth.netlify.app/#/simulation</a><br>
A stream on the public HAPI FHIR R4 server — <a href="https://hapi.fhir.org/baseR4/Patient/81129">https://hapi.fhir.org/baseR4/Patient/81129</a><br>
Demo video — StreamChart-demo.mp4 (4 min 24 s, English subtitles)</div>
<h2 class="pb">About the project</h2>
{about_html}
<h2 class="pb">Pitch deck</h2>
{''.join(f'<img class="full" src="{s}"><div class="cap">Slide {i+1} of {len(slides)}</div>' for i, s in enumerate(slides))}
<h2 class="pb">Screenshots</h2>
{''.join(f'<img class="full" src="{s}"><div class="cap">{cap(s)}</div>' for s in shots)}
</body></html>"""
open('submission.html', 'w').write(html)
subprocess.run(['node', '-e', f"""
const {{ chromium }} = require('/home/user/streamchart/node_modules/@playwright/test');
(async () => {{ const b = await chromium.launch({{ executablePath: process.env.CHROME }}); const p = await b.newPage();
await p.goto('file://{os.getcwd()}/submission.html'); await p.waitForTimeout(1500);
await p.pdf({{ path: 'StreamChart-submission.pdf', format: 'A4', printBackground: true, margin: {{ top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' }} }}); await b.close(); }})();
"""], check=True)
print('ok')
