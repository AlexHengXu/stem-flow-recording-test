// Distortion — drawing, particles, drag and camera gestures.
(()=>{'use strict';
const video=document.getElementById('camera'),status=document.getElementById('status'),start=document.getElementById('start'),cursor=document.getElementById('cursor');
const orbs=[...document.querySelectorAll('.orb')],canvases=[0].map(i=>document.getElementById('fx'+i)),values=[0].map(i=>document.getElementById('value'+i));
const state={amount:[.3],shown:[.3],paused:false,time:0};const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
function setAmount(i,a){state.amount[i]=clamp(a);values[i].textContent=Math.round(state.amount[i]*100)+'%';}
// ===== Stem Flow · Tremolo & Distortion v2 (always alive, glow + music dust) =====
const TAU=Math.PI*2;
const rgbaC=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${Math.max(0,Math.min(1,a))})`;
const mixC=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
const WH=[255,255,255];
const glowCache={};
function glowSprite(col){const id=col.join();if(glowCache[id])return glowCache[id];const s=document.createElement('canvas');s.width=s.height=64;
  const g=s.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,rgbaC(mixC(col,WH,.55),1));gr.addColorStop(.3,rgbaC(col,.42));gr.addColorStop(1,rgbaC(col,0));
  g.fillStyle=gr;g.fillRect(0,0,64,64);return glowCache[id]=s;}
function orbG(c,x,y,r,col,al){if(al<=.004||r<=.5)return;c.globalAlpha=Math.min(1,al);c.drawImage(glowSprite(col),x-r,y-r,2*r,2*r);c.globalAlpha=1;}
function noteG(c,x,y,s,col,a,beam,rot){if(a<.01)return;c.save();c.translate(x,y);c.rotate(rot);c.fillStyle=rgbaC(col,a);c.strokeStyle=rgbaC(col,a);c.lineWidth=Math.max(1.2,s*.11);
  const head=(hx,hy)=>{c.beginPath();c.ellipse(hx,hy,s*.27,s*.19,-.45,0,TAU);c.fill();};
  const stem=(sx,sy)=>{c.beginPath();c.moveTo(sx,sy);c.lineTo(sx,sy-s*.95);c.stroke();};
  if(beam){head(-s*.32,s*.42);head(s*.32,s*.3);stem(-s*.08,s*.38);stem(s*.56,s*.26);c.lineWidth=Math.max(1.4,s*.16);c.beginPath();c.moveTo(-s*.08,-s*.57);c.lineTo(s*.56,-s*.69);c.stroke();}
  else{head(0,s*.4);stem(s*.24,s*.36);c.beginPath();c.moveTo(s*.24,-s*.59);c.quadraticCurveTo(s*.62,-s*.35,s*.5,-s*.05);c.stroke();}c.restore();}
function sparkleG(c,x,y,L,col,al){if(al<.01)return;c.lineWidth=1.2;
  [[1,0],[0,1]].forEach(([dx,dy])=>{const gr=c.createLinearGradient(x-dx*L,y-dy*L,x+dx*L,y+dy*L);gr.addColorStop(0,rgbaC(col,0));gr.addColorStop(.5,rgbaC(mixC(col,WH,.75),al));gr.addColorStop(1,rgbaC(col,0));
    c.strokeStyle=gr;c.beginPath();c.moveTo(x-dx*L,y-dy*L);c.lineTo(x+dx*L,y+dy*L);c.stroke();});orbG(c,x,y,L*.7,col,.55*al);}

// --- music dust: notes, star sparkles, glow specks (the shared Stem Flow standard) ---
function makeDust(){return{list:[],acc:0};}
function stepDust(D,dt,rate,spawn){D.acc+=rate*dt;while(D.acc>=1){D.acc-=1;D.list.push(spawn());}
  for(const p of D.list){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}D.list=D.list.filter(p=>p.age<p.life);}
function drawDust(c,D,t,cols,gain,warpX){
  for(const p of D.list){const q=p.age/p.life,fade=Math.min(1,q*4)*Math.pow(1-q,1.2),tw=.62+.38*Math.sin(t*2.2+p.tw);
    const al=Math.min(1,fade*tw*gain),col=cols[p.ci%cols.length],x=p.x+(warpX?warpX(p.x,p.y):0),y=p.y;
    if(p.type==='note'){orbG(c,x,y,p.s*1.7,col,.45*al);noteG(c,x,y,p.s,mixC(col,WH,.55),al,p.beam,Math.sin(t*.6+p.tw)*.2);}
    else if(p.type==='star'){const k=Math.pow(Math.abs(Math.sin(t*1.6+p.tw)),3);sparkleG(c,x,y,p.s*(.6+.8*k),col,al*(.5+.5*k));}
    else if(p.type==='streak'){const L=p.s*(1+Math.abs(p.vx)*.04),dir=Math.sign(p.vx);const gr=c.createLinearGradient(x-dir*L,y,x,y);gr.addColorStop(0,rgbaC(col,0));gr.addColorStop(1,rgbaC(mixC(col,WH,.7),al));
      c.strokeStyle=gr;c.lineWidth=1.3;c.beginPath();c.moveTo(x-dir*L,y);c.lineTo(x,y);c.stroke();orbG(c,x,y,5,col,.6*al);}
    else{orbG(c,x,y,p.s*2.4,col,.6*al);c.fillStyle=rgbaC(mixC(col,WH,.7),al);c.beginPath();c.arc(x,y,p.s*.45,0,TAU);c.fill();}}}
function inDisc(R){const r=Math.sqrt(Math.random())*R,th=Math.random()*TAU;return[Math.cos(th)*r,Math.sin(th)*r];}

// ================= shared bits for Chorus / Beat Repeat =================
const CP=[186,150,255],CB=[63,167,255],CSV=[214,222,236];
function blobG(c,x,y,r,col,a){if(a<=0)return;const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgbaC(col,a));gr.addColorStop(1,rgbaC(col,0));c.fillStyle=gr;c.fillRect(x-r,y-r,2*r,2*r);}
function glowLine(c,pts,col,w,a=1,blur=14,close=false){if(a<=.003)return;a=Math.min(1,a*1.35);c.lineCap='round';c.lineJoin='round';
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(close)c.closePath();
  c.shadowColor=rgbaC(col,a);c.shadowBlur=blur*2.2;c.strokeStyle=rgbaC(col,.22*a);c.lineWidth=w*3.2;c.stroke();
  c.shadowBlur=blur;c.strokeStyle=rgbaC(col,.75*a);c.lineWidth=w*1.3;c.stroke();
  c.shadowBlur=0;c.strokeStyle=rgbaC(mixC(col,WH,.6),.95*a);c.lineWidth=Math.max(.9,w*.5);c.stroke();}
function hazeG(c,R,col,a,t){blobG(c,0,0,R*.95,col,.34*a*(.92+.08*Math.sin(t*.7)));blobG(c,0,0,R*.5,mixC(col,WH,.35),.2*a);
  for(let i=0;i<9;i++){const an=i*2.39+t*.035*(i%2?1:-1),rr=R*(.2+.6*((i*.618)%1));blobG(c,Math.cos(an)*rr,Math.sin(an)*rr,R*(.22+.1*Math.sin(t*.4+i)),col,.13*a);}}

const dsm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
// ================= DISTORTION (original signal-tear look, pushed further at the top end) =================
const DC=[100,219,255],DV=[188,145,255];
const DS={dust:makeDust(),t:null,ev:{last:0,next:0,events:[]}};
function updateGlitchEvents(t,a){
 const g=DS.ev,rand=(lo,hi)=>lo+Math.random()*(hi-lo);
 if(t<g.last){g.events=[];g.next=t;}g.last=t;
 g.events=g.events.filter(e=>t<e.start+e.life);
 if(a<.005){g.events=[];g.next=t;return [];}
 if(t>=g.next){
  const hi=Math.max(0,a-.7)/.3;                                  // 70-100%: extra tears at once
  const count=1+(Math.random()<a*.8?1:0)+(a>.75&&Math.random()<(a-.75)*3?1:0)+(Math.random()<hi*.8?1:0);
  for(let n=0;n<count;n++){
   const w=rand(.035,.12+.18*a+.1*hi);g.events.push({start:t,life:rand(.23,.65+1.65*a),attack:rand(.015,.095),release:rand(.05,.32),y:rand(-.85,.8-w),w,
    shift:rand(.06,.28+.04*hi)*(Math.random()<.5?-1:1),focus:rand(-.8,.8),bend:rand(-.16,.16)*(1+1.3*hi),seed:Math.random()*5000});
  }
  g.next=t+rand(.13,.8)/(.45+a*2.8+hi*1.5);
 }
 return g.events.slice(-10).map(e=>{const age=t-e.start;
  const gain=dsm(0,e.attack,age)*(1-dsm(e.life-e.release,e.life,age));
  return {...e,power:gain*Math.pow(a,1.2),w:e.w*(.7+.3*a)};
 });
}
function drawDistortion(c,a,t){
 const R=238,dt=DS.t===null?0:Math.max(0,Math.min(.05,t-DS.t));DS.t=t;
 c.save();c.translate(256,256);c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.clip();
 const hash=n=>{const v=Math.sin(n*127.1+41.7)*43758.5453;return v-Math.floor(v);};
 const faults=updateGlitchEvents(t,a),hi=Math.max(0,a-.7)/.3;
 const amp=(.65+1.2*a)*(1+.35*hi*hi);                              // how far a tear throws the lines
 function warp(y,x){let shift=.0035*Math.sin(y*2.2+t*.7+x*1.4),edge=0,gap=0;   // gentle sway: never fully still
  for(const f of faults){const u=(y-f.y)/f.w;if(u<0||u>1)continue;
   const soft=.12+.22*a,envelope=dsm(0,soft,u)*(1-dsm(1-soft*1.3,1,u));
   const local=.3+.9*Math.exp(-Math.pow((x-f.focus)/.55,2));
   shift+=f.power*amp*(f.shift*envelope+Math.sin(u*Math.PI*1.6)*f.bend*local);
   edge=Math.max(edge,f.power*Math.max(Math.exp(-Math.pow(u/.045,2)),Math.exp(-Math.pow((1-u)/.045,2)))*local);
   if(u>.955)gap=Math.max(gap,f.power*.88);
  }
  return {shift,edge,gap};
 }
 // soft coloured bloom behind every tear (glow, not white)
 c.globalCompositeOperation='lighter';
 orbG(c,0,0,R*.95,DC,.05+.025*Math.sin(t*.7)+.05*a);
 for(const f of faults){if(f.power<.04)continue;c.save();c.scale(1,.22);orbG(c,f.focus*R,(f.y+f.w/2)*R/.22,R*(.5+.4*a),f.shift>0?DV:DC,.16*f.power);c.restore();}
 c.globalCompositeOperation='source-over';
 const scanY=((t*.3)%2.8)-1.4;
 for(let j=0;j<102;j++){
  const x=-1.3+j*2.6/101,seed=hash(j+20),violet=Math.sin(j*.62)>.15;
  for(let pass=0;pass<2;pass++){
   c.shadowBlur=pass===0?(2+7*a):0;c.shadowColor=violet?'#bc91ff':'#64dbff';
   let previous=null;
   for(let k=0;k<=192;k++){
    const y=-1+k/96,w=warp(y,x);
    const fringe=(pass===0?(violet?1:-1)*(.003*a+.012*a*a+.012*hi):0);
    const p={x:(x+w.shift+fringe)*238,y:y*238,edge:w.edge,gap:w.gap};
    if(previous){
     const scan=pass?Math.exp(-Math.pow((y-scanY)/.1,2))*(.18+.25*seed):0;     // rolling glint
     const bright=Math.min(1,.24+seed*.32+a*.34+w.edge*.85+scan);
     const flat=Math.abs(p.x-previous.x)>Math.abs(p.y-previous.y)*1.5?(pass?.6:.3):1;   // keep sheared runs from piling into a white block
     c.globalAlpha=(pass===0?(.1+.3*a):bright)*(1-w.gap)*flat;
     c.strokeStyle=w.edge>.48?'#ffffff':violet?`rgb(${Math.round(165+70*a)},${Math.round(120+75*a)},255)`:seed>.8?'#d6faff':`rgb(${Math.round(65+85*a)},${Math.round(155+70*a)},255)`;
     c.lineWidth=pass===0?(1.5+1.5*a):(.7+seed*.5+a*.4+w.edge*.65);
     c.beginPath();c.moveTo(previous.x,previous.y);c.lineTo(p.x,p.y);c.stroke();
    }
    previous=p;
   }
  }
 }
 c.shadowBlur=4;c.shadowColor='#a88bff';
 for(let i=0;i<faults.length;i++){
  const f=faults[i];if(!f.power)continue;
  for(let j=0;j<48;j++){
   const x=(hash(j+i*137)*2-1)*238,hotspot=Math.exp(-Math.pow((x/238-f.focus)/.55,2));
   c.globalAlpha=f.power*(.15+.6*hotspot)*hash(j+f.seed);
   c.strokeStyle=j%3?'#90d9ff':'#efd6ff';c.lineWidth=.7+hotspot;
   const y=(f.y+f.w)*238+(hash(j*3+i)-.5)*3;
   c.beginPath();c.moveTo(x,y);c.lineTo(x+2+hash(j+45)*8*f.power,y);c.stroke();
  }
 }
 c.shadowBlur=0;c.globalAlpha=1;c.globalCompositeOperation='lighter';
 stepDust(DS.dust,dt,2.2+9*a,()=>{const [x,y]=inDisc(R*.9),q=Math.random();
   return{x,y,vx:(Math.random()-.5)*12,vy:-5-9*Math.random(),age:0,life:2+2.4*Math.random(),tw:Math.random()*9,ci:Math.random()<.5?0:1,
     type:q<.14+.22*a?'note':q<.34+.18*a?'star':'dot',s:q<.36?11+9*Math.random():1.4+2*Math.random(),beam:Math.random()<.35};});
 drawDust(c,DS.dust,t,[DC,DV],.8+.5*a,(x,y)=>warp(y/R,x/R).shift*R);   // notes get torn along with the signal
 c.restore();
}

let last=0;function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(!state.paused&&!document.hidden)state.time+=dt;state.shown.forEach((a,i)=>state.shown[i]+=(state.amount[i]-a)*(1-Math.exp(-dt*12)));canvases.forEach((cv,i)=>{const box=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),n=Math.round(box.width*dpr);if(cv.width!==n){cv.width=n;cv.height=n;}const c=cv.getContext('2d');c.setTransform(n/512,0,0,n/512,0,0);c.clearRect(0,0,512,512);drawDistortion(c,state.shown[i],state.time);});requestAnimationFrame(frame);}requestAnimationFrame(frame);
document.getElementById('pause').onclick=e=>{state.paused=!state.paused;e.target.textContent=state.paused?'繼續動態':'暫停動態';};
let pointer=null;orbs.forEach((orb,i)=>{orb.addEventListener('pointerdown',e=>{pointer={i,y:e.clientY,a:state.amount[i],height:orb.clientHeight};orb.setPointerCapture(e.pointerId);orb.classList.add('drag');});orb.addEventListener('pointermove',e=>{if(pointer?.i===i)setAmount(i,pointer.a+(pointer.y-e.clientY)/Math.max(120,pointer.height*.7));});const end=()=>{pointer=null;orb.classList.remove('drag')};orb.addEventListener('pointerup',end);orb.addEventListener('pointercancel',end);});
let hands=null,stream=null,tracking=false,gesture=null,pinched=false,armed=true,previousX=null,lastSeen=0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function screenPoint(p){const scale=Math.max(innerWidth/video.videoWidth,innerHeight/video.videoHeight);return{x:innerWidth/2+( .5-p.x)*video.videoWidth*scale,y:innerHeight/2+(p.y-.5)*video.videoHeight*scale};}
function hit(p){return orbs.findIndex(o=>{const b=o.getBoundingClientRect();return Math.hypot(p.x-b.left-b.width/2,p.y-b.top-b.height/2)<=b.width/2;});}
function clearGesture(){gesture=null;pinched=false;armed=false;previousX=null;cursor.style.display='none';orbs.forEach(o=>o.classList.remove('active','drag'));}
function results(r){const list=r.multiHandLandmarks||[];if(!list.length){clearGesture();return;}let hand=list[0];if(previousX!==null)hand=list.reduce((best,h)=>Math.abs(h[9].x-previousX)<Math.abs(best[9].x-previousX)?h:best,hand);if(previousX!==null&&Math.abs(hand[9].x-previousX)>.24){clearGesture();}previousX=hand[9].x;lastSeen=performance.now();const palm=Math.max(.03,distance(hand[5],hand[17]));const ratio=distance(hand[4],hand[8])/palm;const closed=pinched?ratio<.52:ratio<.34;const point=screenPoint({x:(hand[4].x+hand[8].x)/2,y:(hand[4].y+hand[8].y)/2});cursor.style.display='block';cursor.style.left=point.x+'px';cursor.style.top=point.y+'px';cursor.classList.toggle('pinched',closed);const zone=hit(point);if(!closed){armed=true;gesture=null;}else if(!pinched&&armed){armed=false;if(zone>=0)gesture={i:zone,y:point.y,a:state.amount[zone],height:orbs[zone].clientHeight};}pinched=closed;if(gesture)setAmount(gesture.i,gesture.a+(gesture.y-point.y)/Math.max(120,gesture.height*.7));orbs.forEach((o,i)=>{o.classList.toggle('active',zone===i);o.classList.toggle('drag',gesture?.i===i)});status.textContent=gesture?'捏住上下移動 · 放開保持數值':'手移入圓圈，捏住拇指與食指開始調整';}
function loadHands(){if(window.Hands)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('手勢模型下載失敗，請確認網路後重試。'));};document.head.appendChild(s);});}
async function track(){if(!tracking)return;try{if(video.readyState>=2)await hands.send({image:video});}catch(e){clearGesture();status.textContent='手勢追蹤中斷；可先拖曳圓圈，或停止後重開攝影機。';}if(performance.now()-lastSeen>700)clearGesture();if(tracking)requestAnimationFrame(track);}
function stop(){tracking=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;clearGesture();start.textContent='開啟攝影機與手勢';status.textContent='攝影機已停止；仍可用拖曳圓圈調整。';}
start.onclick=async()=>{if(tracking){stop();return;}start.disabled=true;status.textContent='正在啟用攝影機並載入手勢模型…';try{if(!navigator.mediaDevices?.getUserMedia)throw Error('此瀏覽器無法啟用攝影機，請以 Chrome 或 Edge 開啟。');await loadHands();stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;await video.play();hands=hands||new window.Hands({locateFile:f=>'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/'+f});hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.65,minTrackingConfidence:.65});hands.onResults(results);armed=false;tracking=true;start.textContent='停止攝影機';status.textContent='張開手指，移入圓圈後捏住上下移動';track();}catch(e){stop();status.textContent=e.name==='NotAllowedError'?'攝影機權限未開啟；允許權限後可重試，或拖曳圓圈。':e.message;}finally{start.disabled=false;}};
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearGesture();});

})();
