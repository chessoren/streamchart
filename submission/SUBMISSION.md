# StreamChart: Devpost submission kit

## Project name
**StreamChart**

## Elevator pitch (Devpost blurb, ≤ 200 characters)
> Every patient has a chart. Now every stream does: a 60-second citizen check-up, a sealed AI second look, confidence grades, a care plan signed by an ecologist, and a reply. In FHIR R4.

(184 characters)

## Track (choose one on Devpost)
**Track 7: Digital Health Standards.** The chart is an HL7 FHIR R4 record (Patient + Location, QuestionnaireResponse, Observation, Media, Device, Provenance, DiagnosticReport, RiskAssessment, CarePlan, Communication), and the public HAPI FHIR R4 server accepts it. The project also covers Tracks 3, 2, 5, 4 and 6, which are listed in the “About the project” section.

## About the project
See **ABOUT.md** (about 5,000 words, in Devpost markdown: Inspiration / What it does / How I built it / Challenges / Accomplishments / What I learned / What's next / Honesty). Paste it as is.

## Built with (25 tags)
1. react
2. typescript
3. vite
4. gemini
5. google-ai-studio
6. gemini-vision
7. structured-output
8. hl7-fhir
9. fhir-r4
10. hapi-fhir
11. open-meteo
12. sha-256
13. commit-reveal
14. css3
15. html5
16. lucide
17. qrcode
18. playwright
19. vitest
20. netlify
21. github
22. fish-audio
23. ffmpeg
24. wikimedia-commons
25. claude-code

## “Try it out” links
- Live app: https://streamchart-oneaquahealth.netlify.app
- Source code (public, MIT): https://github.com/chessoren/streamchart
- Emergency scene (60-second simulation): https://streamchart-oneaquahealth.netlify.app/#/simulation
- A stream's chart: https://streamchart-oneaquahealth.netlify.app/#/stream/marcaissonne
- The check-up: https://streamchart-oneaquahealth.netlify.app/#/stream/trois-ponts/checkup
- A stream on the public HAPI FHIR R4 server: https://hapi.fhir.org/baseR4/Patient/81129 (public test server, which may purge data; the “Post to public HAPI FHIR server” button in any chart recreates it)
- Demo video: *(your YouTube link once uploaded)*

## Video
- File: `video/StreamChart-demo.mp4` (1920×1080, 30 fps, H.264/AAC, 4 min 24 s, English subtitles burned in, narration in Oren's voice cloned with Fish Audio s2.1-pro-free, original score synthesized for the video).
- Suggested YouTube title: **StreamChart — Every patient has a chart. Now every stream does. | OneAquaHealth IEEE Hackathon 2026**
- Suggested YouTube description:

> StreamChart gives every urban stream what medicine gives every patient: a record, regular check-ups, a hypothesis with a stated confidence, a care plan signed by a qualified human, and a follow-up until recovery.
>
> 0:00 The stream nobody looks at
> 0:21 The problem with citizen science
> 0:44 The insight: medicine solved this a century ago
> 1:06 The 60-second check-up and the sealed AI second look
> 1:58 The stream's chart: grades, hypothesis, care plan
> 2:26 A week in 60 seconds (labelled simulation, real engine)
> 3:32 The loop closes: the reply and the stream's voice
> 3:53 HL7 FHIR R4, signs and school kit
>
> Live app: https://streamchart-oneaquahealth.netlify.app
> Code: https://github.com/chessoren/streamchart
> OneAquaHealth IEEE Global Hackathon 2026 — Track 7, Digital Health Standards.
> Demonstration data is labelled as such. Photos: Wikimedia Commons (CC BY-SA), credited in the app.

## Images for Devpost
- Thumbnail / logo: `logo/streamchart-logo-1024.png` (1024×1024)
- Gallery, 3:2: `slides/slide-01.png` … `slide-13.png` (1950×1300) and the raw screenshots `screenshots/01…16.png` (1950×1300)

## Which prize to aim for
This hackathon has **no sponsor or special-track prizes**: every project competes for the same overall ranking, scored on Impact 30%, Innovation 20%, Technical 20%, UX 15% and Feasibility 15%.
- 1st: $1,500 · Runner-up: $1,000 · Third: $500 · 2 Special Mentions: $250 (for projects just outside the top 3)
- Plus an IEEE Certificate of Merit (top 3), possibly a one-year IEEE membership (top 3) and an IEEE Senior Member nomination for eligible IEEE members.

So there is only one prize to aim for: **1st place, $1,500.** The only choice that affects your chances is the track. **Track 7** is where StreamChart is strongest: few teams will ship a FHIR model this complete and accepted by a real server, and the jury includes an HL7 Fellow (Gora Datta) plus IEEE standards people. The essay explicitly maps the project to the other tracks so that every judge finds their own topic in it.
