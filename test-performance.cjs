const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./test-source.cjs')();
function part(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j);}
const tasks=[],prompts=[],sends=[];let resolveSend,paints=0,countdowns=0;
const c=vm.createContext({requestAnimationFrame:f=>tasks.push(f),document:{hidden:false,body:{classList:{contains:()=>false}}},
 state:{phase:'mix',fadeActive:[false]},video:{readyState:2,currentTime:1},lastVideoTime:-1,
 hands:{send(){sends.push(1);return new Promise(r=>resolveSend=r);}},
 updateFades(){},updatePlayback(){},updateUI(){},updateJoinCountdown(){countdowns++;},
 resetGestureControls(){},stateLine:{},console,Promise});
vm.runInContext(part('    let trackingBusy=', '    async function enableCameraAndAudio()'),c);
(async()=>{
 vm.runInContext('frame(0)',c);assert.equal(sends.length,1);assert.equal(tasks.length,1);
 c.video.currentTime=2;vm.runInContext('frame(40);frame(80);frame(120)',c);
 assert.equal(sends.length,1,'No overlapping inferences');assert.equal(countdowns,4,'Display runs while inference promise is pending');
 resolveSend();await new Promise(setImmediate);vm.runInContext('frame(160)',c);assert.equal(sends.length,2);
 c.document.hidden=true;vm.runInContext('frame(200)',c);assert.equal(sends.length,2);
 c.document.hidden=false;c.state.phase='paused';resolveSend();await new Promise(setImmediate);vm.runInContext('frame(240)',c);assert.equal(sends.length,2);
 const ui=vm.createContext({requestAnimationFrame:f=>tasks.push(f),paintUI(){paints++;}});
 vm.runInContext(part('    let uiUpdatePending=', '    function paintUI()'),ui);tasks.length=0;
 vm.runInContext('for(let i=0;i<100;i++)updateUI()',ui);assert.equal(tasks.length,1);tasks.shift()();assert.equal(paints,1);
 const countdown=vm.createContext({state:{phase:'join'},gestureGate:{presentSince:1000},joinFrameAt:1500,
 handPrompt:{set textContent(v){prompts.push(v)},get textContent(){return prompts.at(-1)}}});
 vm.runInContext(part('function updateJoinCountdown(', 'function processStableResults('),countdown);
 vm.runInContext('updateJoinCountdown(1500);updateJoinCountdown(1600)',countdown);
 assert.deepEqual(prompts,['Hand detected · starting in 2.5s','Hand detected · starting in 2.4s']);
 vm.runInContext('updateJoinCountdown(2500)',countdown);assert.equal(prompts.at(-1),'Show your hand for 3 seconds to start');
 assert.equal(countdown.state.phase,'join','Display cannot start the game without fresh hand results');
 // The real renderer spreads work over callbacks while retaining 30 Hz per orb.
 const start=html.indexOf('    let lastVisualTick='),end=html.indexOf('\n    requestAnimationFrame(visualTick);',start);
 const batches=[],zones=[];
 let drawCost=0,clock=0;
 const v=vm.createContext({performance:{now:()=>clock},requestAnimationFrame(){},document:{hidden:false,body:{classList:{contains:()=>false}}},state:{phase:'mix',mode:'tracks',effectTrack:0},motionPreference:{matches:false},materialTime:0,updateStemMotion(){},renderMaterials(indices){clock+=drawCost;if(indices)batches.push(Array.from(indices));},effectKeys:['reverb','delay','filter','quit'],tracks:[{key:'vocals'}],fxAmount:()=>.5,renderZone:(...args)=>zones.push(args)});
 vm.runInContext(html.slice(start,end),v);
 for(let t=0;t<1000-1e-6;t+=1000/60)vm.runInContext(`visualTick(${t})`,v);
 assert.equal(batches.length,60);assert(batches.every(a=>a.length===2));
 for(let i=0;i<4;i++)assert.equal(batches.filter(a=>a.includes(i)).length,30);
 v.state.mode='effects';for(let t=1000;t<2000-1e-6;t+=1000/60)vm.runInContext(`visualTick(${t})`,v);
 for(let i=0;i<4;i++)assert.equal(zones.filter(a=>a[0]===i).length,30);
 assert(zones.every(a=>Math.abs(a[4]-1/30)<1e-6),'FX uses its own elapsed interval, not half-speed batch time');
 const countBefore=zones.length;v.document.hidden=true;vm.runInContext('visualTick(2100)',v);assert.equal(zones.length,countBefore);
 v.document.hidden=false;v.state.phase='paused';vm.runInContext('visualTick(2200)',v);assert.equal(zones.length,countBefore);
 v.document.hidden=false;v.state.phase='intro';v.document.body.classList.contains=()=>true;const tutorialBatches=batches.length;vm.runInContext('visualTick(2250)',v);assert.equal(zones.length,countBefore,'Tutorial must not draw hidden FX');assert.equal(batches.length,tutorialBatches);v.document.body.classList.contains=()=>false;
 const before=batches.length;v.state.phase='mix';v.state.mode='tracks';v.state.performanceRecording=true;vm.runInContext('visualTick(2300)',v);assert.equal(batches.at(-1).length,1,'Recording limits drawing work per frame');v.state.performanceRecording=false;drawCost=30;for(let t=2400;t<2700;t+=20)vm.runInContext(`visualTick(${t})`,v);assert.equal(batches.at(-1).length,1,'Expensive draws reduce batch size');
 console.log('PASS: inference/control independence, single-flight tracking, coalesced UI, stale join guard, two-orb rendering batches, per-orb 30 Hz and paused/hidden rendering skip.');

})().catch(e=>{console.error(e);process.exitCode=1;});
