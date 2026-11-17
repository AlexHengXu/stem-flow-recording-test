const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/js/app.js','utf8');
const code=source.slice(source.indexOf('    function releaseScreenCapture()'),source.indexOf('    function startMixer()'));
function track(kind){return {kind,readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';},addEventListener(n,f){this.ended=f;}};}
const video=track('video'),camera=track('video'),audio=track('audio');
let options,downloads=0,savedName,savedType;const recorders=[];
class Stream{constructor(tracks){this.tracks=tracks;}getTracks(){return this.tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}}
class Recorder{constructor(stream,opts){this.stream=stream;this.opts=opts;this.mimeType=opts.mimeType;this.state='inactive';recorders.push(this);}start(timeslice){assert.equal(timeslice,undefined,'Finalize one complete MP4');assert.equal(typeof this.ondataavailable,'function','Handlers must be attached before start');this.state='recording';}pause(){this.state='paused';}resume(){this.state='recording';}stop(){this.state='inactive';}finish(){this.ondataavailable({data:new Blob(['video'])});this.onstop();}}
const c=vm.createContext({window:{},screenStream:null,cameraStream:new Stream([camera]),recordToggle:{checked:true},state:{recordPerformance:true,phase:"mix"},navigator:{mediaDevices:{async getDisplayMedia(o){options=o;return new Stream([video]);}}},MediaStream:Stream,MediaRecorder:Recorder,recordingDestination:{stream:new Stream([audio])},supportedRecordingTypes:['video/mp4'],mediaRecorder:null,mediaChunks:[],recordFormatHint:{},updateUI(){},Blob,URL:{createObjectURL:blob=> {savedType=blob.type;return 'blob:test'},revokeObjectURL(){}},document:{body:{appendChild(){}},createElement(){return {click(){downloads++;savedName=this.download;},remove(){}};}},setTimeout(){},Date});
vm.runInContext(code,c);
(async()=>{
 await c.prepareScreenRecording();assert.equal(options.audio,false,'Do not duplicate tab/system audio');assert.equal(options.video.frameRate.max,30);
 c.state.phase="intro";c.startPerformanceRecording();assert.equal(recorders.length,0,"Tutorial must never start a recording");c.state.phase="mix";
 c.startPerformanceRecording();let r=recorders[0];assert.deepEqual(Array.from(r.stream.tracks),[video,audio],'Record shared screen plus remix, never raw camera');assert.equal(r.opts.videoBitsPerSecond,2500000);
 c.pausePerformanceRecording();assert.equal(r.state,'paused');c.startPerformanceRecording();assert.equal(r.state,'recording','Entering mixer after paused tutorial must resume recording');assert.equal(recorders.length,1,'Tutorial and gameplay must stay in one recording');assert.equal(c.state.recordingPaused,false);c.pausePerformanceRecording();c.resumePerformanceRecording();assert.equal(r.state,'recording');
 c.stopPerformanceRecording(false,false);assert.equal(video.stops,0,'Restart retains screen selection');c.startPerformanceRecording();const next=recorders[1];r.finish();assert.equal(downloads,0);assert.equal(c.mediaRecorder,next,'Old recorder cannot clear new session');
 video.ended();assert.equal(next.state,'inactive');assert.equal(video.stops,0,'Keep capture alive until the final stop event');assert.equal(audio.stops,0,'Shared audio destination stays alive');assert.equal(camera.stops,0,'Tracking camera stays alive');next.finish();assert.equal(video.stops,1,'Release capture only after final data');assert.equal(downloads,1);assert(savedName.endsWith(".mp4"));assert.equal(savedType,"video/mp4");assert.equal(c.screenStream,null);assert.equal(c.state.performanceRecording,false);
 c.recordToggle.checked=true;c.navigator.mediaDevices.getDisplayMedia=async()=>{throw Object.assign(new Error('cancel'),{name:'NotAllowedError'});};await assert.rejects(c.prepareScreenRecording(),{name:'NotAllowedError'});assert.equal(c.screenStream,null);
 const v2=track('video');c.navigator.mediaDevices.getDisplayMedia=async()=>new Stream([v2]);await c.prepareScreenRecording();c.state.recordPerformance=true;c.MediaRecorder=class{constructor(){throw Error('codec unavailable');}};c.startPerformanceRecording();assert.equal(v2.stops,1);assert.equal(c.recordToggle.checked,false);
 console.log('PASS: screen+remix source, bounded encoding, pause/resume, restart isolation, stop-sharing save, cancellation and codec failure cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Run the shipped capability selection against MP4, WebM-only and absent APIs.
const selection=source.slice(source.indexOf('    const recordingTypes ='),source.indexOf('    const pauseOverlay'));
for(const mode of ['mp4','webm','missing']){
 const hint={},toggle={};const env={navigator:{mediaDevices:{getDisplayMedia(){}}},recordToggle:toggle,document:{getElementById:()=>hint}};
 if(mode!=='missing')env.MediaRecorder={isTypeSupported:t=>t.startsWith('video/'+mode)};
 vm.runInNewContext(selection,env);assert.equal(toggle.disabled,mode!=='mp4');assert(hint.textContent.includes(mode==='mp4'?'Recording format: MP4':'MP4 recording is unavailable'));
}
console.log('PASS: MP4 selection, WebM-only rejection, unavailable recorder and MP4 download MIME/extension.');
