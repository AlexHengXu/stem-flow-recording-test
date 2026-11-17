const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.STEM_APP||__dirname+'/js/app.js','utf8');
function part(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j);}
function fixture(){
 const tracks=['vocals','bass','drums','other'].map(key=>({key})),gains=[];
 const graph=Object.fromEntries(tracks.map((t,i)=>[t.key,{gain:{gain:{setTargetAtTime(v){gains[i]=v;}}}}]));
 const c={state:{phase:'mix',mode:'tracks',selected:0,volumes:[.8,.8,.8,.8],fadeActive:[false,false,false,false]},tracks,graph,gains,audioContext:{currentTime:1},
 handDots:[0,1].map(()=>({style:{},classList:{toggle(){}}})),gestureLine:{},gestureNext:()=>false,gestureModeAt:0,effectKeys:['reverb','delay','filter','quit'],dragHands:[null,null],dragOwner:null,fadeHands:[null,null],intro:{active:false},gestureRepeat:null,fxBankAwaitRelease:false,joinFrameAt:0,updateUI(){},setSelected(i){c.state.selected=i;},releaseGestureRepeat(){},resetGestureControls(){},fadeTo(){},completeIntro(){},introRender(){},fxAmount(){return 0},recordEvent(){},performance:{now:()=>2000}};
 vm.createContext(c);vm.runInContext(part('    function fingerExtended(', '    function getZoneTrackIndex(')+part('class StemGestureGate {','const introSteps =')+part('    function setVolume(','    function fadeTo(')+part('function routeStableGesture(', '/* END_STEM_INTRO_CONTROLS */'),c);
 function feed(time,y,pinch=true,x=.25){const points=Array.from({length:21},()=>({x:1-x,y:1-y,z:0}));points[5].x-=.06;points[17].x+=.06;points[4].x+=pinch?.012:.1;c.points=points;vm.runInContext(`processStableResults([readGesture(points)],${time})`,c);}
 return{c,feed};
}
for(const cadence of [33,100,400]){
 const {c,feed}=fixture();let t=1000;for(let i=0;i<8;i++)feed(t+=cadence,.7);
 feed(t+=cadence,.35);feed(t+=cadence,.35);
 assert(c.state.volumes[0]<.7,`Volume must decrease at ${cadence}ms cadence, even with >.28 palm movement`);
 assert.equal(c.gains[0],c.state.volumes[0],'Actual setVolume updates audio gain');
 assert.equal(c.state.selected,0,'Crossing quadrants preserves grabbed track');
 for(let i=0;i<5;i++)feed(t+=cadence,.35,false);
 const v=c.state.volumes[0];feed(t+=cadence,.2,false);assert.equal(c.state.volumes[0],v,'Release stops volume changes');
}
{
 const {c,feed}=fixture();feed(1000,.7);feed(1100,.7);feed(1200,.6);
 const value=c.state.volumes[0];vm.runInContext('processStableResults([],1300)',c);
 assert.equal(c.dragOwner,null,'Tracking loss releases the grab');
 feed(1400,.2);assert.equal(c.state.volumes[0],value,'New detection must not jump volume');
 feed(2500,.9);assert.equal(c.state.volumes[0],value,'Long stalls re-anchor instead of applying stale motion');
}
{
 const {c}=fixture();
 vm.runInContext(`
 gestureGate.reset();
 const left={screenX:.2,handY:.7,palmX:.2,palmY:.7,pinchRatio:.1};
 const right={screenX:.8,handY:.7,palmX:.8,palmY:.7,pinchRatio:.1};
 gestureGate.update([left,right],1000);
 const swapped=gestureGate.update([right,left],1100);
 if(swapped[0].id!==1 || swapped[1].id!==0)throw Error('Two-hand identity swapped');
 `,c);
}
console.log('PASS: landmark-to-gate-to-volume-to-audio at 30/10/2.5Hz, fast travel, quadrant lock and release.');
