const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/js/record-menu.js','utf8');
function fixture(options={}){
 const els={};for(const id of ['recordMenuButton','recordChoices','recordFromNow','recordFromStart','recordBack','recordSave','recordMenuStatus','continueButton','restartButton','instruction'])els[id]={textContent:''};
 const events=[],timers=new Set();let cb=0,captureRequests=0,config;
 const track={readyState:'live',getCaptureHandle:()=>({handle:options.wrong?'wrong-tab':'game'})};
 const stream={getVideoTracks:()=>[track]};
 function player(){let time=37;const listeners={};return {get currentTime(){return time},set currentTime(t){time=t;events.push('seek:'+t);queueMicrotask(()=>listeners.seeked?.())},seeking:false,addEventListener(n,f){listeners[n]=f},removeEventListener(n){delete listeners[n]}};}
 const c={state:{phase:'paused',recordPerformance:false,volumes:[.3,.7]},pausedFrom:'mix',recordToggle:{disabled:!!options.unsupported,checked:false},recordFormatHint:{textContent:'MP4 unavailable'},mediaRecorder:null,screenStream:null,players:{v:player(),d:player()},helpOverlay:{visible:true},pauseOverlay:{visible:true},endingOverlay:{visible:false},window:{},navigator:{mediaDevices:{setCaptureHandleConfig:x=>config=x}},crypto:{randomUUID:()=> 'game'},location:{origin:'https://test.example'},
 document:{getElementById:id=>els[id],createElement(){return {readyState:2,currentTime:0,async play(){},pause(){events.push('preview-cleanup')},requestVideoFrameCallback(f){const id=++cb;if(!options.stall)queueMicrotask(()=>{this.currentTime+=.05;f()});return id},cancelVideoFrameCallback(){}}}},
 setTimeout(f){const t=setTimeout(f,20);timers.add(t);return t},clearTimeout(t){clearTimeout(t);timers.delete(t)},
 async prepareScreenRecording(){captureRequests++;if(options.cancel)throw Object.assign(Error(),{name:'NotAllowedError'});c.screenStream=stream},
 audioContext:{async resume(){}},hideOverlay:o=>o.visible=false,showOverlay:o=>o.visible=true,resetGestureControls(){},introRender(){},updateUI(){},
 startPerformanceRecording(){events.push('encode');assert(!c.helpOverlay.visible);assert(!c.pauseOverlay.visible);assert.equal(c.state.phase,'mix');if(!options.codec)c.mediaRecorder={state:'recording'}},
 playAll(){events.push('play');assert(c.mediaRecorder?.state==='recording')},pauseAll(){events.push('pause')},releaseScreenCapture(){events.push('release');c.screenStream=null},stopPerformanceRecording(save){assert(save);events.push('save');c.mediaRecorder=null}};
 vm.runInNewContext(source,c);return {c,els,events,get requests(){return captureRequests},clean(){timers.forEach(clearTimeout)}};
}
(async()=>{
 for(const mode of ['now','restart']){
  const f=fixture();f.els.recordMenuButton.onclick();assert(!f.els.recordChoices.hidden);
  for(const id of ['continueButton','restartButton'])assert(f.els[id].hidden,'Record choices must replace ordinary pause actions');
  f.els.recordBack.onclick();assert(f.els.recordChoices.hidden);for(const id of ['continueButton','restartButton'])assert(!f.els[id].hidden,'Back restores pause actions');f.els.recordMenuButton.onclick();
  const pending=f.c.window.StemRecordMenu.begin(mode);assert(f.c.window.StemRecordMenu.busy);await f.c.window.StemRecordMenu.begin(mode);await pending;
  assert.equal(f.requests,1);assert.equal(f.c.state.phase,'mix');assert.equal(f.c.players.v.currentTime,mode==='now'?37:0);assert.equal(f.c.players.d.currentTime,mode==='now'?37:0);
  assert.deepEqual(f.c.state.volumes,[.3,.7]);assert(f.events.indexOf('encode')<f.events.indexOf('play'));assert(f.events.indexOf('preview-cleanup')<f.events.indexOf('encode'));
  f.c.state.phase='paused';f.c.mediaRecorder.state='paused';f.c.window.StemRecordMenu.refresh();assert(!f.els.recordSave.hidden);f.els.recordSave.onclick();assert(f.events.includes('save'));f.clean();
 }
 for(const option of ['cancel','wrong','codec','stall']){
  const f=fixture({[option]:true});await f.c.window.StemRecordMenu.begin('restart');assert.equal(f.c.state.phase,'paused');assert(f.c.pauseOverlay.visible);assert.equal(f.c.players.v.currentTime,37);assert(!f.events.includes('play'));assert(!f.c.window.StemRecordMenu.busy);assert(!f.c.recordToggle.checked);f.clean();
 }
 const f=fixture();f.c.pausedFrom='intro';await f.c.window.StemRecordMenu.begin('now');assert.equal(f.requests,0);f.clean();
 const u=fixture({unsupported:true});await u.c.window.StemRecordMenu.begin('now');assert.equal(u.requests,0);u.clean();
 console.log('PASS: now/restart positions, preserved mix, live-frame wait, encode-before-play, save, duplicate lock, cancellation, wrong tab, encoder failure, stalled capture, tutorial/unsupported guards');
})().catch(e=>{console.error(e);process.exitCode=1});
