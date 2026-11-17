const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./test-source.cjs')();
const events={},calls=[],tracks=['vocals','bass','drums','other'].map(key=>({key}));
const state={mode:'tracks',phase:'mix',selectedEffect:0,effectTrack:0,playback:false,volumes:[.8,.8,.8,.8],chorus:[0,0,0,0]};
const graph=Object.fromEntries(tracks.map(t=>[t.key,{effects:{repeat:null,release(){this.repeat=null;calls.push('release');}}}]));
const context={state,graph,tracks,effectKeys:['reverb','delay','filter','quit'],effectNames:['Reverb','Delay','Filter','Quit'],
  intro:{active:false},performance:{now:()=>2000},resetGestureControls(){calls.push('reset');},gestureModeAt:0,updateUI(){},
  window:{addEventListener:(type,fn)=>events[type]=fn,StemFX:{trigger:async(index)=>{graph[tracks[index].key].effects.repeat={};}}},
  document:{addEventListener(){},hidden:false},Element:class {},stateLine:{},
  handDots:[{style:{},classList:{toggle(){}}},{style:{},classList:{toggle(){}}}],gestureNext:()=>false,
  dragOwner:null,dragHands:[null,null],fadeHands:[null,null],
  applyEffect:(index,key,value)=>{state[key]??=[0,0,0,0];state[key][index]=value;},setSelected(){},setVolume(){},fadeTo(){},
  enterEffectMode(){},exitEffectMode(){state.mode='tracks';},completeIntro(){},introRender(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/js/fx-bank-switch.js','utf8'),context);
const route=html.slice(html.indexOf('function routeStableGesture('),html.indexOf('function processStableResults('));
vm.runInContext(route,context);
const run=code=>vm.runInContext(code,context);
assert.equal(run('toggleFxBank()'),false,'J is inert on main page');
state.mode='effects';assert.equal(run('toggleFxBank()'),true);
assert.deepEqual(context.effectKeys,['chorus','tremolo','distortion','beat_repeat']);
assert.equal(run('fxAmount("distortion",0)'),0);
const gesture=(zone,pinch,y=.6)=>({id:0,zone,pinch,handY:y,markerScreenX:.2,markerScreenTop:.2});
context.g=gesture(0,true);run('routeStableGesture(g,3000)');
context.g=gesture(0,true,.8);run('routeStableGesture(g,3100)');assert(Math.abs(state.chorus[0]-.5)<1e-6);
context.g=gesture(0,false);run('routeStableGesture(g,3200)');
context.g=gesture(3,true);run('routeStableGesture(g,3300)');assert(graph.vocals.effects.repeat);
context.g=gesture(3,false);run('routeStableGesture(g,3400)');assert.equal(graph.vocals.effects.repeat,null);
context.g=gesture(3,true);run('routeStableGesture(g,3500)');run('toggleFxBank()');assert.equal(graph.vocals.effects.repeat,null);
assert.deepEqual(context.effectKeys,['reverb','delay','filter','quit']);
state.phase='paused';assert.equal(run('toggleFxBank()'),false);
state.phase='intro';context.intro.active=true;assert.equal(run('toggleFxBank()'),false);
assert(!html.includes('id="fxTestPanel"'),'No floating panel in shipped HTML');
console.log('PASS: main-page no-op, FX bank switching, continuous pinch, repeat hold/release, switch cancellation, paused/tutorial guards.');
