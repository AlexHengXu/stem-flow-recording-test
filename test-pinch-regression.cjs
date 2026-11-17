const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./test-source.cjs')();
const dot=()=>({style:{},classList:{toggle(){}}});
const state={phase:'mix',mode:'effects',effectTrack:0,selectedEffect:0,volumes:[.5,.5,.5,.5]};
const context={state,gestureLine:{},handDots:[dot(),dot()],gestureNext:()=>false,gestureModeAt:0,
 effectKeys:['chorus','tremolo','distortion','beat_repeat'],dragHands:[null,null],dragOwner:null,fadeHands:[null,null],
 intro:{active:false,nextOwner:null},gestureRepeat:null,fxBankAwaitRelease:false,joinFrameAt:0,
 updateUI(){},fxAmount:()=>0,applyEffect:(i,k,v)=>{state[k]=v;},setSelected(){},setVolume(){},releaseGestureRepeat(){},
 startGestureRepeat(){},resetGestureControls(){},fadeTo(){},enterEffectMode(){},exitEffectMode(){},completeIntro(){},introRender(){}};
vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('class StemGestureGate {'),html.indexOf('const introSteps =')),context);
vm.runInContext(html.slice(html.indexOf('function routeStableGesture('),html.indexOf('/* END_STEM_INTRO_CONTROLS */')),context);
function frame(t,y,ratio=.1,x=.2){context.input=[{screenX:x,handY:y,palmX:x,palmY:.6,pinchRatio:ratio,thumbUp:false,open:false}];vm.runInContext(`processStableResults(input,${t})`,context);}
frame(1000,.6);frame(1100,.6);frame(1200,.8);frame(1300,.35);frame(1400,.35);
assert.equal(state.selectedEffect,0,'Dragging across a zone must keep the grabbed effect selected');
frame(1500,.95);frame(1600,.99);frame(1700,.99);frame(1800,.99);frame(1900,.99);
assert.equal(state.chorus,1);
frame(2000,.97);
assert(state.chorus<1,'Reversing from the maximum must respond immediately without dead travel');
frame(2100,.6,.8);frame(2200,.6,.8);
vm.runInContext('gestureGate.reset();fxBankAwaitRelease=true;dragHands.fill(null);dragOwner=null',context);
frame(3000,.6,.1);assert.equal(context.fxBankAwaitRelease,true,'Fresh debounce must not count a physically closed pinch as release');
frame(3100,.7,.1);assert.equal(context.dragOwner,null);
assert.match(context.gestureLine.textContent,/Release fingers/);
frame(3200,.7,.8);frame(3300,.7,.8);assert.equal(context.fxBankAwaitRelease,false);
frame(3400,.7,.1);frame(3500,.7,.1);frame(3600,.8,.1);assert.equal(context.dragOwner,0);
frame(3700,.8,.8);frame(3800,.8,.8);assert.equal(context.dragOwner,null);
console.log('PASS: real gate + routing: zone locking, saturation reversal, J release guard, re-grab, release.');

for(const keys of [['reverb','delay','filter','quit'],['chorus','tremolo','distortion','beat_repeat']]){
  context.effectKeys=keys;
  for(let z=0;z<3;z++){
    vm.runInContext('gestureGate.reset();dragHands.fill(null);dragOwner=null',context);
    const x=z===2?.8:.2,y=z===1?.25:.6;
    frame(5000,y,.1,x);frame(5100,y,.1,x);frame(5200,y+.1,.1,x);
    assert(state[keys[z]]>0,keys[z]+' responds to stable pinch motion');
    context.input=[];vm.runInContext('processStableResults(input,5300)',context);
    assert.equal(context.dragOwner,null,'Lost hand releases ownership');
  }
}
console.log('PASS: all six continuous effects, both banks, and tracking-loss release.');
