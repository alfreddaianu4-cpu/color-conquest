const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

const TILE_SIZE = 20;
const WIDTH = 1000;
const HEIGHT = 650;
const COLS = WIDTH / TILE_SIZE;
const ROWS = HEIGHT / TILE_SIZE;

let players = {};
let readyPlayers = {};
let map = [];
let gameStarted = false;
let gameTime = 120;
let timer = null;

let lobbyCountdown = 300;
let lobbyInterval = null;

function resetMap(){
  map=[];
  for(let y=0;y<ROWS;y++){
    map[y]=[];
    for(let x=0;x<COLS;x++){
      map[y][x]="grey";
    }
  }
}
resetMap();

function randomSpawn(){
  return {
    x: Math.floor(Math.random()*(WIDTH-20)),
    y: Math.floor(Math.random()*(HEIGHT-20))
  }
}

function startGame(){

  clearInterval(lobbyInterval);
  lobbyInterval=null;

  if(gameStarted) return;

  gameStarted=true;
  io.emit("gameStart");

  timer=setInterval(()=>{
    gameTime--;
    io.emit("timer",gameTime);

    if(gameTime<=0){
      clearInterval(timer);
      endGame();
    }

  },1000);
}

function endGame(){

  gameStarted=false;

  const scores={};

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const c=map[y][x];
      if(c!=="grey"){
        scores[c]=(scores[c]||0)+1;
      }
    }
  }

  let winnerColor=null;
  let max=0;

  for(let c in scores){
    if(scores[c]>max){
      max=scores[c];
      winnerColor=c;
    }
  }

  let winner = Object.values(players).find(p=>p.color===winnerColor);

  io.emit("gameEnd",winner);

  gameTime=120;
  readyPlayers={};
  resetMap();
}

io.on("connection",(socket)=>{

  socket.on("join",(player)=>{

    if(Object.values(players).find(p=>p.color===player.color)){
      socket.emit("colorTaken");
      return;
    }

    const spawn=randomSpawn();

    players[socket.id]={
      ...player,
      x:spawn.x,
      y:spawn.y
    };

    readyPlayers[socket.id]=false;

    io.emit("players",players);
    io.emit("readyStatus",readyPlayers);
    io.emit("map",map);

    if(!lobbyInterval){
      lobbyCountdown=300;
      lobbyInterval=setInterval(()=>{
        lobbyCountdown--;
        io.emit("lobbyTimer",lobbyCountdown);
        if(lobbyCountdown<=0){
          startGame();
        }
      },1000);
    }
  });

  socket.on("ready",()=>{
    readyPlayers[socket.id]=true;
    io.emit("readyStatus",readyPlayers);

    const allReady = Object.values(readyPlayers).every(r=>r===true);

    if(allReady && Object.keys(players).length>0){
      startGame();
    }
  });

  socket.on("move",(key)=>{

    if(!players[socket.id] || !gameStarted) return;

    let p = players[socket.id];
    const speed=10;

    if(key==="ArrowLeft") p.x -= speed;
    if(key==="ArrowRight") p.x += speed;
    if(key==="ArrowUp") p.y -= speed;
    if(key==="ArrowDown") p.y += speed;

    p.x = Math.max(0, Math.min(p.x, WIDTH-20));
    p.y = Math.max(0, Math.min(p.y, HEIGHT-20));

    const tileX = Math.floor(p.x / TILE_SIZE);
    const tileY = Math.floor(p.y / TILE_SIZE);

    if(tileX>=0 && tileY>=0 && tileX<COLS && tileY<ROWS){
      map[tileY][tileX] = p.color;
    }

    io.emit("players",players);
    io.emit("map",map);
  });

  socket.on("disconnect",()=>{
    delete players[socket.id];
    delete readyPlayers[socket.id];
    io.emit("players",players);
    io.emit("readyStatus",readyPlayers);
  });

});

http.listen(3000,()=>{
  console.log("Server running on http://localhost:3000");
});
