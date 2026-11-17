// Chorus — drawing, particles, drag and camera gestures.
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
// ================= CHORUS (woven aurora rings — the chosen look, now moving) =================
const CH={dust:makeDust(),t:null};
function drawChorus(c,a,t){
  const R=238,k0=R/250,dt=CH.t===null?0:Math.max(0,Math.min(.05,t-CH.t));CH.t=t;if(a<=.004){return;}
  c.save();c.translate(256,256);c.beginPath();c.arc(0,0,R,0,TAU);c.clip();c.globalCompositeOperation='lighter';
  const cols=[CP,CB,mixC(CP,WH,.4),[120,140,255],mixC(CB,WH,.5)];hazeG(c,R,mixC(CP,CB,.4),a,t);
  const n=Math.max(1,Math.round(1+7*a));
  for(let L2=0;L2<3;L2++){const r0=R*(.32+L2*.2),spin=t*.06*(L2%2?-1:1);
    for(let i=0;i<n;i++){const ph=i/n*TAU,k=3+L2,amp=k0*(6+22*a)*(1-L2*.15)*(.88+.12*Math.sin(t*.5+i+L2));
      const pts=[];for(let s=0;s<=360;s++){const th=s/360*TAU;const rr=r0+amp*Math.sin(th*k+ph+t*.6)+amp*.4*Math.sin(th*(k+2)-ph-t*.35);pts.push([Math.cos(th+spin)*rr,Math.sin(th+spin)*rr]);}
      const shimmer=.85+.15*Math.sin(t*1.1+i*1.3+L2);
      glowLine(c,pts,cols[(i+L2)%cols.length],1.2+1.2*a,(.25+.55*a)*(1-L2*.15)*shimmer,18+10*a,true);}}
  c.shadowBlur=0;
  stepDust(CH.dust,dt,2+10*a,()=>{const [x,y]=inDisc(R*.9),q=Math.random(),th=Math.atan2(y,x);
    return{x,y,vx:-Math.sin(th)*10,vy:Math.cos(th)*10-4,age:0,life:2.2+2.4*Math.random(),tw:Math.random()*9,ci:Math.random()<.6?0:1,
      type:q<.14+.2*a?'note':q<.32+.18*a?'star':'dot',s:q<.34?11+9*Math.random():1.4+2*Math.random(),beam:Math.random()<.35};});
  drawDust(c,CH.dust,t,[mixC(CP,WH,.4),mixC(CB,WH,.3)],.75+.5*a);
  c.restore();
}

let last=0;function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(!state.paused&&!document.hidden)state.time+=dt;state.shown.forEach((a,i)=>state.shown[i]+=(state.amount[i]-a)*(1-Math.exp(-dt*12)));canvases.forEach((cv,i)=>{const box=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),n=Math.round(box.width*dpr);if(cv.width!==n){cv.width=n;cv.height=n;}const c=cv.getContext('2d');c.setTransform(n/512,0,0,n/512,0,0);c.clearRect(0,0,512,512);drawChorus(c,state.shown[i],state.time);});requestAnimationFrame(frame);}requestAnimationFrame(frame);
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
