const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let strokes=0,depth=0;
const gradient={addColorStop(p){assert(Number.isFinite(p)&&p>=0&&p<=1);}};
const ctx=new Proxy({}, {get(_,name){if(name==='save')return()=>depth++;if(name==='restore')return()=>{assert(depth>0);depth--;};if(name==='stroke')return()=>strokes++;if(name==='createRadialGradient'||name==='createLinearGradient')return()=>gradient;return(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),name+' finite coordinates');};},set(){return true;}});
const sandbox={Path2D:class{moveTo(){}lineTo(){}closePath(){}},window:{},document:{createElement:()=>({getContext:()=>ctx})}};
vm.runInNewContext(fs.readFileSync(__dirname+'/js/team-visuals.js','utf8'),sandbox);
const visual=sandbox.window.StemTeamVisuals;
for(const [i,key] of ['chorus','tremolo','distortion','beat_repeat'].entries()){
 assert(visual.has(key));for(const a of [0,.5,1])for(let f=0;f<45;f++){
  strokes=0;assert(visual.draw(ctx,i,key,'vocals',a,1/30));assert.equal(depth,0);assert(strokes<1200,key+' bounded strokes');
 }
 assert(visual.draw(ctx,i,key,'bass',1,10));assert.equal(depth,0);
}
assert(!visual.draw(ctx,0,'unknown','vocals',1,.1));visual.reset();
const app=fs.readFileSync(__dirname+'/js/app.js','utf8');assert(app.includes('StemTeamVisuals.draw(F,i,kind,key,a,dt)'));assert(!app.includes("chorus:'reverb'"));
console.log('PASS: four team renderers, zero/mid/max amounts, bounded strokes, finite coordinates, balanced canvas state, stem switching and game dispatch.');
