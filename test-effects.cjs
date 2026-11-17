const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {OfflineAudioContext}=require(process.env.STEM_AUDIO_ENGINE||'node-web-audio-api');
const text=fs.readFileSync(__dirname+'/js/stem-effects.js','utf8');
const scope=vm.createContext({Float32Array});
vm.runInContext(text.slice(0,text.indexOf('const STEM_NEW_EFFECTS')),scope);
const Rack=vm.runInContext('StemEffectRack',scope);
const sr=48000,seconds=2;
function input(ctx){
  const b=ctx.createBuffer(2,sr*seconds,sr);
  for(let c=0;c<2;c++)for(let i=0;i<b.length;i++)b.getChannelData(c)[i]=.3*Math.sin(2*Math.PI*220*i/sr)+.1*Math.sin(2*Math.PI*331*i/sr);
  return b;
}
const rms=(a,start=.4,end=1.8)=>{let s=0,n=0;for(let i=Math.floor(sr*start);i<Math.floor(sr*end);i++){s+=a[i]*a[i];n++;}return Math.sqrt(s/n);};
function difference(a,b,start=.4,end=1.8){return rms(a.map((x,i)=>x-b[i]),start,end);}
async function render(effect,amount=1){
  console.log('Rendering',effect||'dry',amount);
  const ctx=new OfflineAudioContext(2,sr*seconds,sr),rack=new Rack(ctx),buffer=input(ctx);
  const source=ctx.createBufferSource();source.buffer=buffer;source.connect(rack.input);rack.output.connect(ctx.destination);
  if(effect)rack.set(effect,amount);source.start();
  const output=await ctx.startRendering();return {rack,output,data:output.getChannelData(0),buffer};
}
function wav(file,buffer){
  const channels=buffer.numberOfChannels,n=buffer.length,out=Buffer.alloc(44+n*channels*2);
  out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);
  out.writeUInt16LE(channels,22);out.writeUInt32LE(sr,24);out.writeUInt32LE(sr*channels*2,28);out.writeUInt16LE(channels*2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(out.length-44,40);
  for(let i=0;i<n;i++)for(let c=0;c<channels;c++)out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]))*32767),44+(i*channels+c)*2);
  fs.writeFileSync(file,out);
}
(async()=>{
  fs.mkdirSync(__dirname+'/test-audio',{recursive:true});
  const report={};
  if(!process.argv.includes('--beat-only')){
  const dry=await render();assert(difference(dry.data,dry.buffer.getChannelData(0))<1e-6,'Neutral rack preserves dry audio');
  wav(__dirname+'/test-audio/dry.wav',dry.output);
  for(const effect of ['chorus','tremolo','distortion']){
    const zero=await render(effect,0);assert(difference(zero.data,dry.data)<1e-6,effect+' neutral');
    const wet=await render(effect);assert(difference(wet.data,dry.data)>.01,effect+' changes actual audio');
    assert(wet.data.every(Number.isFinite));assert(wet.data.every(v=>Math.abs(v)<1),'Fixture has headroom');
    const mid=await render(effect,.5);assert(difference(mid.data,dry.data)>.025,effect+' is noticeable at halfway');
    if(effect==='chorus')assert(difference(wet.data,wet.output.getChannelData(1))>.03,'Chorus creates stereo movement');
    wav(__dirname+'/test-audio/'+effect+'.wav',wet.output);
    report[effect]={rms:rms(wet.data),difference:difference(wet.data,dry.data)};
    if(effect==='tremolo'){
      for(let i=sr/2;i<sr*1.5;i+=101){
        const expected=dry.data[i]*(.5+.5*Math.sin(2*Math.PI*4*i/sr));
        assert(Math.abs(wet.data[i]-expected)<.002,'Tremolo follows the 120 BPM eighth-note envelope');
      }
    }
    assert.throws(()=>wet.rack.set(effect,NaN));assert.throws(()=>wet.rack.setBpm(0));
    wet.rack.set(effect,5);assert.equal(wet.rack.amounts[effect],1);
  }
  }
  const ctx=new OfflineAudioContext(2,sr*seconds,sr),rack=new Rack(ctx),buffer=input(ctx);
  // A changing phrase makes a captured repeat distinguishable from the live signal.
  for(let c=0;c<2;c++)for(let i=0;i<buffer.length;i++)buffer.getChannelData(c)[i]*=.3+.7*i/buffer.length;
  const source=ctx.createBufferSource();source.buffer=buffer;source.connect(rack.input);rack.output.connect(ctx.destination);source.start(0,.5);
  const start=await rack.trigger(async()=>buffer,()=>.5,()=>true);
  assert(Math.abs(start-.125)<1e-8,'Quantize to next sixteenth at 120 BPM');
  assert.equal(rack.repeat.source.buffer.length,6000,'One sixteenth captured');
  const slice=rack.repeat.source.buffer.getChannelData(0);assert(Math.abs(slice[0])<1e-9);assert(Math.abs(slice[slice.length-1])<1e-9);
  assert(slice.slice(Math.ceil(slice.length*.8)).every(v=>v===0),'Repeat includes a clean rhythmic gap for sustained stems');
  // Schedule the same release automation at a known audio time before offline rendering.
  rack.context={currentTime:.75};rack.release();rack.context=ctx;
  const output=await ctx.startRendering();
  const data=output.getChannelData(0);
  let error=0;for(let i=12000;i<17000;i++)error=Math.max(error,Math.abs(data[i]-data[i+6000]));
  console.log('Beat loop error',error,'sample',data[12500],data[18500]);
  assert(error<1e-5,'Captured slice repeats rather than following live source');
  const live=buffer.getChannelData(0);
  for(let i=sr;i<sr*1.2;i++)assert(Math.abs(data[i]-live[i+sr/2])<1e-5,'Release returns to live position without rewinding');
  wav(__dirname+'/test-audio/beat-repeat.wav',output);
  const pendingCtx=new OfflineAudioContext(2,sr,sr),pending=new Rack(pendingCtx);
  let resolve;const job=pending.trigger(()=>new Promise(r=>resolve=r),()=>0,()=>true);
  pending.release();resolve(buffer);assert.equal(await job,null,'Release cancels an in-flight decode/trigger');
  await assert.rejects(pending.trigger(async()=>buffer,()=>0,()=>false),/Start playback/);
  await pending.trigger(async()=>buffer,()=>0,()=>true);pending.release();assert.equal(pending.repeat,null,'Cancel scheduled repeat before it starts');
  pending.clear();assert(Object.values(pending.amounts).every(v=>v===0));
  report.beat_repeat={quantizedStart:start,loopError:error};
  fs.writeFileSync(__dirname+'/test-results.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS: offline audio rendering, dry bypass, audible differences, bounded fixture peaks, beat grid, repeated slice, live-position release, cancellation and validation.');console.log(report);
})().catch(error=>{console.error(error);process.exitCode=1;});
