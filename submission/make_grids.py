from PIL import Image, ImageDraw, ImageFont, ImageFilter
import glob
NAMES = {'01':'Patients dashboard','02':'Check-up question','03':'Check-up sealed','04':'AI reveal','05':'Compare with the AI and decide','06':'What your check-up changed','07':'Emergency scene and voice','08':'Stream chart in alert','09':'Hypothesis, risk and care plan','10':'Ward room','11':'Citizen inbox','12':'Voice of the stream','13':'Remission and recovery','14':'FHIR R4 export','15':'Sign and school kit','16':'Honesty and sources'}
fs = sorted(glob.glob('screenshots/*.png'))
font_t = ImageFont.truetype('video/fonts/Inter-SemiBold.ttf', 64)
font_c = ImageFont.truetype('video/fonts/Inter-Medium.ttf', 32)
W = 3000; cols, gap, top, side, capH = 4, 44, 200, 70, 80
tw = (W - 2*side - (cols-1)*gap) // cols; th = int(tw * 2/3)
H = top + 2*(th + capH) + gap + 40
for g in range(2):
    canvas = Image.new('RGB', (W, H), '#edf2f8')
    glow = Image.new('RGB', (W, H), '#ffffff'); mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).ellipse((-600, -900, 1800, 700), fill=200); mask = mask.filter(ImageFilter.GaussianBlur(220))
    canvas.paste(glow, (0, 0), mask)
    d = ImageDraw.Draw(canvas)
    d.ellipse((side, 82, side+26, 108), fill='#3b6ef6')
    d.text((side+48, 60), f'StreamChart — app screenshots {g*8+1}–{g*8+8}', font=font_t, fill='#111a2b')
    for i, f in enumerate(fs[g*8:g*8+8]):
        c, r = i % cols, i // cols
        x = side + c*(tw+gap); y = top + r*(th+capH+gap)
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        sh = Image.new('L', (tw+40, th+40), 0); ImageDraw.Draw(sh).rounded_rectangle((20, 26, tw+20, th+26), 24, fill=70)
        canvas.paste(Image.new('RGB', sh.size, '#9fb0c8'), (x-20, y-20), sh.filter(ImageFilter.GaussianBlur(14)))
        m = Image.new('L', (tw, th), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, tw, th), 22, fill=255)
        canvas.paste(im, (x, y), m)
        d.rounded_rectangle((x, y, x+tw, y+th), 22, outline='#dfe6f0', width=3)
        n = f.split('/')[-1][:2]
        d.text((x+4, y+th+20), f'{n} · {NAMES[n]}', font=font_c, fill='#4a566c')
    canvas.save(f'grids/screenshots-{g+1}-of-2.png', optimize=True)
