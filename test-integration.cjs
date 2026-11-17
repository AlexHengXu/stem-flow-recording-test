const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./test-source.cjs')();
const keys=['chorus','tremolo','distortion'],tracks=['vocals','bass','drums','other'].map(key=>({key}));
const state={reverb:[0,0,0,0],delay:[0,0,0,0],filter:[0,0,0,0],fadeActive:[],fadeTargets:[],lastEffectRecord:0};
const events=[],calls=[];
const param={setTargetAtTime(){}};
const graph=Object.fromEntries(tracks.map(({key})=>[key,{
  reverbWet:{gain:param},feedback:{gain:param},delayWet:{gain:param},delay:{delayTime:param},filter:{frequency:param,Q:param},
  effects:{set:(effect,a)=>{calls.push([key,effect,a]);return a;},clear:()=>calls.push([key,'clear'])}
}]));
const players=Object.fromEntries(tracks.map(({key})=>[key,{currentTime:5,play:()=>Promise.resolve(),pause:()=>calls.push([key,'pause'])}]));
const ctx=vm.createContext({state,tracks,graph,players,STEM_NEW_EFFECTS:keys,audioContext:{currentTime:0,resume(){}},
  performance:{now:()=>200},recordEvent:(...args)=>events.push(args),updateUI(){},setSelected(){},setVolume(){},
  stateLine:{},stopStemRepeats:()=>calls.push(['stopRepeats']),syncStemEffects:()=>calls.push(['sync'])});
for(const [a,b] of [['    function applyEffect(', '    function recordEvent('],['    function resetMixState(', '    function showOverlay('],['    function playAll(', '    function resetMixState('],['    function restartAll(', '    function setSelected(']]){
  vm.runInContext(html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a))),ctx);
}
vm.runInContext("applyEffect(0,'chorus',.8)",ctx);assert.equal(state.chorus[0],.8);assert.equal(events[0][0],'effect');
const count=calls.length;vm.runInContext("applyEffect(0,'unknown',.5);applyEffect(0,'chorus',NaN)",ctx);assert.equal(calls.length,count);
vm.runInContext('clearEffects()',ctx);for(const key of keys)assert(state[key].every(a=>a===0));
assert(calls.some(([action])=>action==='stopRepeats'));
vm.runInContext("applyEffect(2,'tremolo',.5);resetMixState()",ctx);assert(state.tremolo.every(a=>a===0));
calls.length=0;vm.runInContext('pauseAll();stopAll();restartAll();playAll()',ctx);
assert.equal(calls.filter(([action])=>action==='stopRepeats').length,3);
assert.equal(calls.filter(([action])=>action==='sync').length,2);
assert(Object.values(players).every(p=>p.currentTime===0));
const effectSource=fs.readFileSync(__dirname+'/js/stem-effects.js','utf8');
assert(html.includes(effectSource),'Built HTML embeds the current effects source');
console.log('PASS: main HTML effect dispatch, state, recording dispatch, clearing, reset, pause/stop/restart hooks, current embedded source.');
