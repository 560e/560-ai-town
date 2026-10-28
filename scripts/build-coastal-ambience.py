"""Locally synthesized quiet wind and distant surf, without melody or field recordings.
Periodic filtered noise and periodic envelopes create a continuous 72-second loop.
Requires numpy and ffmpeg. Output is intentionally much quieter than the old music.
"""
from pathlib import Path
import json, subprocess, tempfile, wave
import numpy as np

rate, seconds = 22050, 72
n = rate * seconds
rng = np.random.default_rng(56007)
t = np.arange(n) / rate
frequency = np.fft.rfftfreq(n, 1 / rate)

def breeze(cutoff):
    noise = rng.normal(size=n)
    spectrum = np.fft.rfft(noise)
    # Broad, soft noise: remove rumble and sharp hiss, without resonant/tonal peaks.
    curve = (frequency / (frequency + 110)) ** 2
    curve /= np.sqrt(1 + frequency / 220) * (1 + (frequency / cutoff) ** 4)
    sound = np.fft.irfft(spectrum * curve, n)
    return sound / np.std(sound)

wash = .62 + .16 * np.sin(2 * np.pi * t * 6 / seconds)
wash += .09 * np.sin(2 * np.pi * t * 9 / seconds + .8)
shared = breeze(1500) * wash
left = shared * .82 + breeze(1000) * .18
right = shared * .82 + breeze(1100) * .18
mix = np.column_stack([left, right])
mix *= .043 / np.sqrt(np.mean(mix ** 2))
output = Path(__file__).resolve().parents[1] / 'public' / 'audio'
output.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as folder:
    wav = Path(folder) / 'quiet-coast.wav'
    with wave.open(str(wav), 'wb') as file:
        file.setnchannels(2); file.setsampwidth(2); file.setframerate(rate)
        file.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libvorbis', '-q:a', '4', str(output / 'quiet-coast.ogg')], check=True)
info = {'title': '海风轻浪', 'source': '本地合成海风与远处浪声；非实地录音，无旋律或外部采样', 'durationSeconds': seconds, 'sampleRate': rate, 'peak': float(np.max(np.abs(mix))), 'rms': float(np.sqrt(np.mean(mix ** 2))), 'loopBoundaryStep': float(np.max(np.abs(mix[0] - mix[-1])))}
(output / 'coast-info.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(info, ensure_ascii=False))
