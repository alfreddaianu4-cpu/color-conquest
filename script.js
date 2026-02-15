const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 20;
const COLS = 1000 / TILE_SIZE;
const ROWS = 650 / TILE_SIZE;

let map=[];
let players={};
let visualPlayers={};
let readyPlayers={};
let me=null;
let gameStarted=false;
let gameTime=120;
let lobbyTime=300;

// ===== RECEIVE DATA =====

socket.on("players",(serverPlayers)=>{
  players=serverPlayers;

  Object.entries(players).forEach(([id,p])=>{
    if(!visualPlayers[id]){
      visualPlayers[id]={x:p.x,y:p.y};
    }
    visualPlayers[id].targetX=p.x;
    visualPlayers[id].targetY=p.y;
  });

  updateLobbyUI();
});

socket.on("map",(serverMap)=>{
  map=serverMap;
});

socket.on("timer",(time)=>{
  gameTime=time;
});

socket.on("lobbyTimer",(time)=>{
  lobbyTime=time;
});

socket.on("readyStatus",(status)=>{
  readyPlayers=status;
  updateLobbyUI();
});

socket.on("gameStart",()=>{
  gameStarted=true;
  document.getElementById("lobby").style.display="none";
});

// 🏆 FIXED WINNER SCREEN
socket.on("gameEnd",(winner)=>{

  let winnerName = winner?.name || "Nobody";

  const screen=document.createElement("div");

  screen.style.position="absolute";
  screen.style.top="50%";
  screen.style.left="50%";
  screen.style.transform="translate(-50%,-50%)";
  screen.style.background="white";
  screen.style.padding="40px 60px";
  screen.style.fontSize="36px";
  screen.style.border="6px solid black";
  screen.style.borderRadius="20px";
  screen.style.boxShadow="0 0 40px rgba(0,0,0,0.4)";
  screen.style.color="black";
  screen.style.textAlign="center";
  screen.style.fontFamily="Arial";

  screen.innerHTML = `
    🏆 WINNER 🏆 <br><br>
    <span style="color:${winner?.color}; font-weight:bold;">
      ${winnerName}
    </span>
  `;

  document.body.appendChild(screen);

  setTimeout(()=>location.reload(),5000);
});

socket.on("colorTaken",()=>{
  alert("Color already taken!");
});

// ===== JOIN =====

function joinGame(){
  const name=document.getElementById("nameInput").value;
  const color=document.getElementById("colorSelect").value;

  if(!name || !color) return;

  me={name,color};
  socket.emit("join",me);
}

function toggleReady(){
  socket.emit("ready");
}

// ===== MOVEMENT =====

document.addEventListener("keydown",(e)=>{
  if(!gameStarted || !me) return;
  socket.emit("move",e.key);
});

// ===== SMOOTH =====

function smoothPlayers(){
  Object.entries(visualPlayers).forEach(([id,v])=>{
    v.x += (v.targetX - v.x)*0.2;
    v.y += (v.targetY - v.y)*0.2;
  });
}

// ===== LOBBY =====

function updateLobbyUI(){
  const list=document.getElementById("playerList");
  list.innerHTML="";

  Object.entries(players).forEach(([id,p])=>{
    const li=document.createElement("li");
    const ready = readyPlayers[id] ? "✔" : "❌";
    li.innerText=`${p.name} (${p.color}) ${ready}`;
    list.appendChild(li);
  });
}

// ===== DRAW MAP =====

function drawMap(){
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      ctx.fillStyle=map[y]?.[x]||"grey";
      ctx.fillRect(x*TILE_SIZE,y*TILE_SIZE,TILE_SIZE,TILE_SIZE);
    }
  }
}

// ===== DRAW PLAYERS =====

function drawPlayers(){
  Object.entries(players).forEach(([id,p])=>{
    const v=visualPlayers[id];
    if(!v) return;

    ctx.fillStyle=p.color;
    ctx.fillRect(v.x,v.y,20,20);

    ctx.fillStyle="black";
    ctx.font="14px Arial";
    ctx.textAlign="center";
    ctx.fillText(p.name,v.x+10,v.y-5);
  });
}

// ===== SCORES =====

function drawScores(){
  let scores={};

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const c=map[y]?.[x];
      if(c && c!=="grey"){
        scores[c]=(scores[c]||0)+1;
      }
    }
  }

  ctx.textAlign="right";
  ctx.font="16px Arial";

  let i=0;

  Object.values(players).forEach(p=>{
    ctx.fillStyle=p.color;
    ctx.fillText(
      p.name+": "+(scores[p.color]||0),
      980,
      30+i*20
    );
    i++;
  });
}

// ===== LOBBY TIMER =====

function drawLobbyTimer(){

  if(gameStarted) return;

  const min=Math.floor(lobbyTime/60);
  const sec=lobbyTime%60;

  ctx.fillStyle="black";
  ctx.font="24px Arial";
  ctx.textAlign="center";
  ctx.fillText(
    "Game starts in: "+min+":"+sec.toString().padStart(2,'0'),
    500,
    50
  );
}

// ===== MAIN DRAW =====

function draw(){

  ctx.clearRect(0,0,1000,650);

  if(!gameStarted){
    drawLobbyTimer();
    return;
  }

  smoothPlayers();

  drawMap();
  drawPlayers();
  drawScores();

  ctx.fillStyle="black";
  ctx.font="20px Arial";
  ctx.textAlign="left";
  ctx.fillText("Time: "+gameTime,20,30);
}

// ===== LOOP =====

function loop(){
  draw();
  requestAnimationFrame(loop);
}
loop();
