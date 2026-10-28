"""Original 80-second ambient composition: soft keys and sustained open chords.
No external recordings. Periodic tail wrapping creates a continuous musical loop.
Run: python scripts/build-ambience.py (requires numpy, ffmpeg on PATH).
"""
from pathlib import Path
import json, subprocess, tempfile, wave
import numpy as np
RATE=22050
SECONDS=80
N=RATE*SECONDS
mix=np.zeros((N,2),dtype=np.float64)
def hz(midi): return 440*2**((midi-69)/12)
def put(signal,start,pan):
    indices=(np.arange(len(signal))+int(start*RATE))%N
    np.add.at(mix[:,0],indices,signal*np.sqrt((1-pan)/2))
    np.add.at(mix[:,1],indices,signal*np.sqrt((1+pan)/2))
def key(midi,start,level=.1,pan=0):
    t=np.arange(8*RATE)/RATE
    f=hz(midi)
    tone=sum(a*np.sin(2*np.pi*f*h*t)*np.exp(-t/(3.4/h)) for h,a in [(1,1),(2,.24),(3,.08),(4,.025)])
    tone*=np.minimum(t/.028,1)*np.minimum((8-t)/.9,1)*level
    put(tone,start,pan)
    # Quiet stereo reflections soften the dry attack without a loop discontinuity.
    put(tone*.14,start+.29,-pan*.7);put(tone*.065,start+.53,pan*.6)
def pad(chord,start):
    t=np.arange(13*RATE)/RATE
    env=np.minimum(t/2.8,1)*np.minimum((13-t)/3,1)
    for i,midi in enumerate(chord):
        sig=(np.sin(2*np.pi*hz(midi)*t)+.15*np.sin(2*np.pi*hz(midi)*2*t))*.014*env
        put(sig,start,(i-1.5)*.22)
# Original "Morning Light": open D-major voicings, slow breathing phrases (48 bpm).
chords=[[50,57,61,66],[47,54,57,62],[43,50,57,59],[45,52,59,64],
        [50,57,61,66],[47,54,57,62],[43,50,57,59],[45,52,57,64]]
melody=[[74,78,81,78],[78,76,74,73],[71,74,78,76],[73,76,74,69],
        [78,81,83,81],[78,74,76,73],[74,71,69,71],[73,76,74,74]]
for bar,chord in enumerate(chords):
    start=bar*10
    pad(chord,start)
    for beat,note in zip([0,2.5,5,7.5],[chord[0],chord[1]+12,chord[2]+12,chord[3]+12]):key(note,start+beat,.057,-.24)
    for beat,note in zip([1.25,3.75,6.25,8.5],melody[bar]):key(note,start+beat,.089,.22)
peak=float(np.max(np.abs(mix)));mix*=.62/peak
out=Path('public/audio');out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='town-music-') as temp:
    wav=Path(temp)/'ambience.wav'
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((mix*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','4',str(out/'morning-light.ogg')],check=True)
metrics={'title':'Morning Light / 晨光小镇','durationSeconds':SECONDS,'sampleRate':RATE,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'loopSeamMaxDelta':float(np.max(np.abs(mix[0]-mix[-1]))),'source':'Original procedural composition; no external audio samples.'}
(out/'ambience-info.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metrics))
