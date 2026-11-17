const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/js/flowie-camera.js','utf8');
const controller=source.slice(0,source.indexOf('(async function animateArtwork()'))+'})();';
function fixture(){
 const button=()=>({disabled:false,setAttribute(){},removeAttribute(){}});
 const enable=button(),skip=button(),feedback={},radios={sessionIntro:{},sessionMix:{}},gate={hidden:false,setAttribute(){},querySelector(s){return {'.camera-enable':enable,'.camera-skip':skip,'.camera-feedback':feedback}[s]}};
 let calls=0,finish;
 const c={URLSearchParams,location:{search:'?flowie=done&lesson=1'},window:{},document:{body:{append(){},classList:{add(){},remove(){}}},createElement:()=>gate,getElementById:id=>radios[id]},state:{cameraReady:false,modelReady:false},menuHint:{textContent:'Camera denied'},startButton:{focus(){}},selectedSession:'intro',enableCameraAndAudio(){calls++;return new Promise(r=>finish=r)}};
 vm.runInNewContext(controller,c);
 return {c,enable,skip,feedback,gate,radios,calls:()=>calls,finish:()=>finish()};
}
(async()=>{
 let f=fixture();assert.equal(f.calls(),0,'loading the welcome screen must not request camera');
 let first=f.enable.onclick();await f.enable.onclick();assert.equal(f.calls(),1,'double click must not start another camera setup');assert(f.enable.disabled&&f.skip.disabled);
 f.finish();await first;assert(!f.gate.hidden);assert.equal(f.feedback.textContent,'Camera denied');assert(!f.enable.disabled);assert(f.c.window.StemCameraGate.pending);
 let retry=f.enable.onclick();f.c.state.cameraReady=f.c.state.modelReady=true;f.finish();await retry;assert(f.gate.hidden);assert(!f.c.window.StemCameraGate.pending);assert(f.radios.sessionIntro.checked);assert.equal(f.c.startButton.textContent,'Begin tutorial');
 f=fixture();let fast=f.skip.onclick();assert.equal(f.calls(),1,'skip practice still prepares the shared camera');f.c.state.cameraReady=f.c.state.modelReady=true;f.finish();await fast;assert(f.radios.sessionMix.checked);assert.equal(f.c.selectedSession,'mix');assert.equal(f.c.startButton.textContent,'Start playing');
 console.log('PASS: camera explicit start, duplicate-click guard, denied permission retry, tutorial route and functional skip route.');
})().catch(e=>{console.error(e);process.exitCode=1});
