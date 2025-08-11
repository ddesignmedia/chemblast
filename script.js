// --- Globale Konfiguration und Variablen für Highscore & UI ---
const GAME_ID = "ChemBlastSpielID";
const BASE_URL = "https://www.ddesignmedia.de/code/";
const GET_HIGHSCORES_URL = BASE_URL + "get_highscores.php";
const SAVE_HIGHSCORE_URL = BASE_URL + "save_score.php";

const LOGICAL_CANVAS_WIDTH = 800;
const LOGICAL_CANVAS_HEIGHT = 600;

const funnyGamerNames = [
    "Atom-Spalter", "Molekül-Magier", "Quanten-Quirler", "Protonen-Paule", "Neutronen-Nick",
    "Elektronen-Else", "Sigma-Susi", "Pi-Paul", "Delta-Dieter", "Gamma-Gabi",
    "Booster-Berta", "Collider-Claus", "Isotopen-Inge", "Valenz-Vera", "Orbital-Otto",
    "Spin-Svenja", "Bosonen-Benno", "Fermionen-Frieda", "Higgs-Herbert", "DunkleMaterie-Doris"
];

const chemicalElements = [
    { symbol: "H", name: "Wasserstoff", charge: 1 }, { symbol: "Li", name: "Lithium", charge: 1 },
    { symbol: "Be", name: "Beryllium", charge: 2 }, { symbol: "N", name: "Stickstoff", charge: -3 },
    { symbol: "O", name: "Sauerstoff", charge: -2 }, { symbol: "F", name: "Fluor", charge: -1 },
    { symbol: "Na", name: "Natrium", charge: 1 }, { symbol: "Mg", name: "Magnesium", charge: 2 },
    { symbol: "Al", name: "Aluminium", charge: 3 }, { symbol: "P", name: "Phosphor", charge: -3 },
    { symbol: "S", name: "Schwefel", charge: -2 }, { symbol: "Cl", name: "Chlor", charge: -1 },
    { symbol: "K", name: "Kalium", charge: 1 }, { symbol: "Ca", name: "Calcium", charge: 2 },
    { symbol: "Br", name: "Brom", charge: -1 }, { symbol: "I", name: "Iod", charge: -1 },
    { symbol: "Rb", name: "Rubidium", charge: 1 }, { symbol: "Sr", name: "Strontium", charge: 2 },
    { symbol: "Cs", name: "Caesium", charge: 1 }, { symbol: "Ba", name: "Barium", charge: 2 },
];

let currentChemicalElement = null;
let currentCorrectCharge = 0;
const POSSIBLE_CHARGES = [-3, -2, -1, 0, 1, 2, 3, 4];
const ELEMENTS_PER_ROUND = 10;

const gameCanvas = document.getElementById('gameCanvas');
let ctx;

const modeSelectionScreen = document.getElementById('modeSelectionScreen');
const gameUI = document.getElementById('gameUI');
const dailyHighscoreListElement = document.getElementById('dailyHighscoreList');
const alltimeHighscoreListElement = document.getElementById('alltimeHighscoreList');
const starryBackground = document.getElementById('starryBackground');

const messageOverlay = document.getElementById('messageOverlay');
const messageText = document.getElementById('messageText');
const finalScoreElement = messageText;

const btnStartGame = document.getElementById('btnStartGame');
const restartButtonFromGameOver = document.getElementById('restartButton');

function createStarsForBackground(numStars = 150) {
    if (!starryBackground) return;
    starryBackground.innerHTML = '';
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * screenWidth}px`;
        star.style.top = `${Math.random() * screenHeight}px`;
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        star.style.opacity = Math.random() * 0.5 + 0.2;
        starryBackground.appendChild(star);
    }
}


async function fetchHighscores(scope) {
    const listElementId = scope === 'daily' ? 'dailyHighscoreList' : 'alltimeHighscoreList';
    const listElement = document.getElementById(listElementId);
    if (!listElement) { console.error("Highscore list element not found for:", listElementId); return; }
    listElement.innerHTML = '<li>Lade...</li>';
    try {
        const url = new URL(GET_HIGHSCORES_URL);
        url.searchParams.append('game_id', GAME_ID);
        url.searchParams.append('scope', scope);
        const response = await fetch(url.toString());
        if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try { const serverError = await response.text(); errorText += `, Server: ${serverError}`; } catch (e) {}
            throw new Error(errorText);
        }
        const jsonData = await response.json();
        let scoresToDisplay = [];
        if (jsonData && jsonData.status === 'success' && Array.isArray(jsonData.highscores)) {
            scoresToDisplay = jsonData.highscores;
        } else if (jsonData && jsonData.status === 'error') {
             console.error(`Server error fetching ${scope} highscores: ${jsonData.message}`);
        } else if (Array.isArray(jsonData)) {
            scoresToDisplay = jsonData;
        }
        displayHighscores(scoresToDisplay, listElementId);
    } catch (error) {
        console.error(`Client/Network error fetching ${scope} highscores:`, error);
        if(listElement) listElement.innerHTML = `<li>Fehler beim Laden.</li>`;
    }
}

function displayHighscores(scores, listElementId) {
    const listElement = document.getElementById(listElementId);
    if (!listElement) return;
    listElement.innerHTML = '';
    if (scores && scores.length > 0) {
        const scoresToShow = scores.slice(0, 6); // Geändert von 10 auf 6
        scoresToShow.forEach((entry) => {
            const listItem = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = entry.player_name || entry.playerName || 'Anonym';
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'player-score';
            scoreSpan.textContent = entry.score;
            listItem.appendChild(nameSpan);
            listItem.appendChild(scoreSpan);
            listElement.appendChild(listItem);
        });
    } else { listElement.innerHTML = '<li>Noch keine Einträge</li>'; }
}

async function saveHighscoreToServer(playerName, scoreValue) {
    try {
        const formData = new FormData();
        formData.append('game_id', GAME_ID);
        formData.append('playerName', playerName);
        formData.append('score', scoreValue);
        const response = await fetch(SAVE_HIGHSCORE_URL, { method: 'POST', body: formData });
        const responseText = await response.text();
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`); }
        try {
            const result = JSON.parse(responseText);
            if (result.success || result.status === 'success') {
                fetchHighscores('daily'); fetchHighscores('alltime');
            } else { console.error('Failed to save highscore (server logic error):', result.message || 'Unknown server error from JSON'); }
        } catch (jsonError) { console.error('Failed to parse JSON response from server for saving score.', jsonError, "Raw response:", responseText); }
    } catch (error) { console.error('Error saving highscore (client/network or bad HTTP status):', error); }
}

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function adaptCanvasSize() {
    const container = document.getElementById('canvasContainer');
    if (!gameCanvas || !container) { console.error("Canvas or CanvasContainer not found for sizing."); return; }
    gameCanvas.width = LOGICAL_CANVAS_WIDTH; gameCanvas.height = LOGICAL_CANVAS_HEIGHT;
    const aspectRatio = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT;
    let availableWidth = container.clientWidth; let calculatedHeight = availableWidth / aspectRatio;
    gameCanvas.style.width = `${availableWidth}px`; gameCanvas.style.height = `${calculatedHeight}px`;
}

function showStartScreen() {
    if(modeSelectionScreen) { modeSelectionScreen.classList.remove('hidden'); modeSelectionScreen.classList.add('flex'); }
    if(gameUI) gameUI.classList.add('hidden');
    if(messageOverlay) messageOverlay.style.display = 'none';
    if(starryBackground) starryBackground.classList.remove('hidden');
    createStarsForBackground();
    fetchHighscores('daily'); fetchHighscores('alltime');
}

function showGameUI() {
    if(modeSelectionScreen) { modeSelectionScreen.classList.add('hidden'); modeSelectionScreen.classList.remove('flex'); }
    if(gameUI) { gameUI.classList.remove('hidden'); gameUI.style.display = 'flex';  }
    if(messageOverlay) messageOverlay.style.display = 'none';
    if(starryBackground) starryBackground.classList.add('hidden');
    adaptCanvasSize();
}

function initializeAndStartNewGame() {
    showGameUI();
    originalStartGameLogic();
}

function handlePlayerDefeat(playerScore) {
    if (playerScore > 0) {
        let nameToSave = localStorage.getItem(GAME_ID + '_playerName');
        if (!nameToSave) {
            nameToSave = funnyGamerNames[getRandomInt(0, funnyGamerNames.length - 1)];
            localStorage.setItem(GAME_ID + '_playerName', nameToSave);
        }
        saveHighscoreToServer(nameToSave || "Anonym", playerScore);
    }
}

if (btnStartGame) {
    btnStartGame.addEventListener('click', () => { initializeAndStartNewGame(); });
}

if (restartButtonFromGameOver) {
    restartButtonFromGameOver.addEventListener('click', () => {
        if (!gameRunning) { showStartScreen(); }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (gameCanvas) {
         ctx = gameCanvas.getContext('2d');
         if (!ctx) { console.error("FEHLER: 2D-Kontext nicht erhalten nach DOMContentLoaded."); if (gameCanvas) gameCanvas.outerHTML = "<p style='color:white; text-align:center;'>Browser nicht unterstützt.</p>"; return; }
    } else { console.error("FEHLER: gameCanvas nicht gefunden nach DOMContentLoaded."); return; }

    let tL = document.getElementById('touchLeft');
    let tR = document.getElementById('touchRight');
    let tT = document.getElementById('touchThrust');
    let tF = document.getElementById('touchFire');
    if (!tL || !tR || !tT || !tF) { console.warn("Eines oder mehrere Touch-Button-Elemente wurden nicht gefunden."); }
    else {
        tL.addEventListener('touchstart', (e) => hTS(e,'left'), { passive: false }); tL.addEventListener('touchend', (e) => hTE(e,'left'), { passive: false });
        tL.addEventListener('mousedown', (e) => hTS(e,'left')); tL.addEventListener('mouseup', (e) => hTE(e,'left'));
        tR.addEventListener('touchstart', (e) => hTS(e,'right'), { passive: false }); tR.addEventListener('touchend', (e) => hTE(e,'right'), { passive: false });
        tR.addEventListener('mousedown', (e) => hTS(e,'right')); tR.addEventListener('mouseup', (e) => hTE(e,'right'));
        tT.addEventListener('touchstart', (e) => hTS(e,'thrust'), { passive: false }); tT.addEventListener('touchend', (e) => hTE(e,'thrust'), { passive: false });
        tT.addEventListener('mousedown', (e) => hTS(e,'thrust')); tT.addEventListener('mouseup', (e) => hTE(e,'thrust'));
        tF.addEventListener('touchstart', (e) => hTS(e,'fire'), { passive: false }); tF.addEventListener('touchend', (e) => hTE(e,'fire'), { passive: false });
        tF.addEventListener('mousedown', (e) => hTS(e,'fire')); tF.addEventListener('mouseup', (e) => hTE(e,'fire'));
    }

    showStartScreen();
    window.addEventListener('resize', () => {
        adaptCanvasSize();
        if (starryBackground && !starryBackground.classList.contains('hidden')) {
            createStarsForBackground();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); }
        if (keys.hasOwnProperty(e.key)) { keys[e.key] = true; }
        if ((e.key === ' ' || e.code === 'Space') && ship && ship.canShoot && !ship.dead) { ship.shoot(); }
    });
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) { keys[e.key] = false; }
        if (ship && !ship.dead && (e.key === ' ' || e.code === 'Space')) { ship.canShoot = true; }
    });
});

// ==================================================================
// SPIELLOGIK
// ==================================================================
let originalScoreDisplay, originalLivesDisplay, originalRoundDisplay, originalCurrentElementNameDisplay;

function initializeOriginalDOMElements() {
    originalScoreDisplay = document.getElementById('score');
    originalLivesDisplay = document.getElementById('lives');
    originalRoundDisplay = document.getElementById('roundDisplay');
    originalCurrentElementNameDisplay = document.getElementById('currentElementName');
}

const SHIP_SIZE = 20; const SHIP_THRUST = 7; const SHIP_TURN_SPEED = 0.15; const FRICTION = 0.99;
const BULLET_SPEED = 7; const BULLET_MAX = 5;
const ASTEROID_SPEED = 1; const ASTEROID_SIZE_LARGE = 56; const ASTEROID_SIZE_MEDIUM = 28;
const SHIP_INVINCIBILITY_DUR = 3; const SHIP_BLINK_DUR = 0.2; const FPS = 60; const GAME_LIVES = 3;
const TEXT_FADE_TIME = 2.5; const SHIP_EXPLOSION_DUR = 0.4; const SHIP_PARTICLE_SPEED = 3;
const GAME_STAR_COUNT = 50;
const GAME_STAR_COLOR = "rgba(220, 220, 220, 0.6)";
const UFO_RADIUS = 15; const UFO_SPEED = 1.5; const UFO_SPAWN_TIME_MIN = 10 * FPS; const UFO_SPAWN_TIME_MAX = 20 * FPS;
const UFO_SHOOT_COOLDOWN = 1.5 * FPS; const UFO_BULLET_SPEED = 4; const UFO_POINTS = 20;
const UFO_EXPLOSION_DUR = 0.3; const UFO_PARTICLE_SPEED = 2.5;
const POWERUP_ITEM_RADIUS = 10; const POWERUP_ITEM_DURATION = 10 * FPS; const SHIELD_MAX_TIME = 15 * FPS;
const SHIELD_RADIUS_MULTIPLIER = 1.8; const SHIELD_COLOR = "rgba(0, 191, 255, 0.5)";

let ship; let bullets = []; let asteroids = []; let shipExplosionParticles = [];
let ufoExplosionParticles = []; let gameStars = []; let powerUps = [];
let ufo = null; let ufoBullets = []; let ufoSpawnTimer = 0;
let score = 0; let lives = GAME_LIVES; let round = 0;
let elementsCorrectThisRound = 0;
let gameRunning = false;
let keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false, Space: false };
let touchState = { left: false, right: false, thrust: false, fire: false, canFire: true };

function hTS(e, control) { e.preventDefault(); touchState[control] = true; }
function hTE(e, control) { e.preventDefault(); touchState[control] = false; if (control === 'fire') { touchState.canFire = true; } }
function distBetweenPoints(x1, y1, x2, y2) { return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)); }

function createGameStars() {
    if (!gameCanvas) return;
    gameStars = [];
    for (let i = 0; i < GAME_STAR_COUNT; i++) {
        gameStars.push({
            x: Math.random() * gameCanvas.width,
            y: Math.random() * gameCanvas.height,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.3,
            opacitySpeed: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.005 + 0.002)
        });
    }
}
function drawGameStars() {
    if (!ctx) return;
    gameStars.forEach(star => {
        star.opacity += star.opacitySpeed;
        if (star.opacity > 0.8 || star.opacity < 0.2) {
            star.opacitySpeed *= -1;
            star.opacity = Math.max(0.2, Math.min(0.8, star.opacity));
        }
        ctx.fillStyle = `rgba(220, 220, 220, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}
let Particle = class {
    constructor(x,y,s,d,c="white",l=5,nS=1){this.x=x;this.y=y;this.segments=[];for(let i=0;i<nS;i++){this.segments.push({angle:Math.random()*Math.PI*2,length:Math.random()*l+l/2,vel:{x:(Math.random()*s*2-s),y:(Math.random()*s*2-s)},rotation:Math.random()*Math.PI*2,rotationSpeed:(Math.random()-0.5)*0.1});}this.alpha=1.0;this.duration=d*FPS;this.color=c;}
    draw(){if(!ctx)return;this.segments.forEach(seg=>{ctx.strokeStyle=`rgba(${this.color==="white"?"255,255,255":"200,200,255"},${this.alpha})`;ctx.lineWidth=2;ctx.beginPath();const sX=this.x-(seg.length/2)*Math.cos(seg.rotation);const sY=this.y-(seg.length/2)*Math.sin(seg.rotation);const eX=this.x+(seg.length/2)*Math.cos(seg.rotation);const eY=this.y+(seg.length/2)*Math.sin(seg.rotation);ctx.moveTo(sX,sY);ctx.lineTo(eX,eY);ctx.stroke();});}
    update(){this.x+=this.segments[0].vel.x*0.3;this.y+=this.segments[0].vel.y*0.3;this.segments.forEach(seg=>{seg.rotation+=seg.rotationSpeed;});this.alpha-=1.0/this.duration;}
};
let PowerUpItem = class {
    constructor(x,y,t="S"){this.x=x;this.y=y;this.type=t;this.radius=POWERUP_ITEM_RADIUS;this.size=25;this.color="lime";this.pulseSpeed=0.05;this.pulseAmount=0;this.pulseDirection=1;this.lifespan=POWERUP_ITEM_DURATION;}
    draw(){if(!ctx)return;const cS=this.size+Math.sin(this.pulseAmount)*5;ctx.font=`bold ${cS}px 'Courier New', Courier, monospace`;ctx.fillStyle=this.color;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(this.type,this.x,this.y);ctx.beginPath();ctx.arc(this.x,this.y,this.radius+Math.sin(this.pulseAmount)*3,0,Math.PI*2);ctx.strokeStyle=`rgba(127,255,0,${0.2+Math.abs(Math.sin(this.pulseAmount))*0.3})`;ctx.lineWidth=2;ctx.stroke();}
    update(){this.pulseAmount+=this.pulseSpeed*this.pulseDirection;if(this.pulseAmount>Math.PI/2||this.pulseAmount<-Math.PI/2)this.pulseDirection*=-1;this.lifespan--;}
};
let Ship = class {
    constructor(){this.x=gameCanvas?gameCanvas.width/2:200;this.y=gameCanvas?gameCanvas.height/2:150;this.radius=SHIP_SIZE/2;this.angle=Math.PI/2;this.vel={x:0,y:0};this.thrusting=false;this.canShoot=true;this.invincible=true;this.invincibilityTime=SHIP_INVINCIBILITY_DUR*FPS;this.blinkTime=SHIP_BLINK_DUR*FPS;this.blinkOn=true;this.dead=false;this.shieldActive=false;this.shieldTimer=0;this.shieldRadius=this.radius*SHIELD_RADIUS_MULTIPLIER;}
    getVertices(){const R=this.radius;const A=this.angle;const nF=1.5,rOF=0.7,sF=0.5;const nX=this.x+R*nF*Math.cos(A);const nY=this.y-R*nF*Math.sin(A);const lWX=this.x-R*(rOF*Math.cos(A)+sF*Math.sin(A));const lWY=this.y+R*(rOF*Math.sin(A)-sF*Math.cos(A));const rWX=this.x-R*(rOF*Math.cos(A)-sF*Math.sin(A));const rWY=this.y+R*(rOF*Math.sin(A)+sF*Math.cos(A));return[{x:nX,y:nY},{x:lWX,y:lWY},{x:rWX,y:rWY}];}
    draw(){if(!ctx||this.dead)return;let sS=true;if(this.invincible&&!this.shieldActive){this.blinkTime--;if(this.blinkTime<=0){this.blinkOn=!this.blinkOn;this.blinkTime=SHIP_BLINK_DUR*FPS;}if(!this.blinkOn)sS=false;}if(sS){ctx.strokeStyle='white';ctx.lineWidth=SHIP_SIZE/15;ctx.beginPath();const v=this.getVertices();ctx.moveTo(v[0].x,v[0].y);ctx.lineTo(v[1].x,v[1].y);ctx.lineTo(v[2].x,v[2].y);ctx.closePath();ctx.stroke();if(this.thrusting&&!this.dead){const R=this.radius;const A=this.angle;const rOF=0.7;const sF=0.5;const rLX=this.x-R*(rOF*Math.cos(A)+sF*Math.sin(A));const rLY=this.y+R*(rOF*Math.sin(A)-sF*Math.cos(A));const rRX=this.x-R*(rOF*Math.cos(A)-sF*Math.sin(A));const rRY=this.y+R*(rOF*Math.sin(A)+sF*Math.cos(A));const bMX=(rLX+rRX)/2;const bMY=(rLY+rRY)/2;const fL=R*0.8;const fTX=bMX-fL*Math.cos(A);const fTY=bMY+fL*Math.sin(A);ctx.fillStyle='white';ctx.beginPath();ctx.moveTo(rLX,rLY);ctx.lineTo(rRX,rRY);ctx.lineTo(fTX,fTY);ctx.closePath();ctx.fill();}}if(this.shieldActive){ctx.beginPath();ctx.arc(this.x,this.y,this.shieldRadius,0,Math.PI*2);const sP=Math.abs(Math.sin(Date.now()/200));const sA=0.3+sP*0.3;ctx.strokeStyle=`rgba(0,191,255,${sA+0.2})`;ctx.fillStyle=`rgba(0,191,255,${sA})`;ctx.lineWidth=2;ctx.fill();ctx.stroke();}}
    update(){if(this.dead||!gameCanvas)return;if(keys.ArrowLeft||touchState.left)this.angle+=SHIP_TURN_SPEED;if(keys.ArrowRight||touchState.right)this.angle-=SHIP_TURN_SPEED;this.thrusting=(keys.ArrowUp||touchState.thrust);if(this.thrusting){this.vel.x+=SHIP_THRUST*Math.cos(this.angle)/FPS;this.vel.y-=SHIP_THRUST*Math.sin(this.angle)/FPS;}else{this.vel.x*=FRICTION;this.vel.y*=FRICTION;}this.x+=this.vel.x;this.y+=this.vel.y;if(this.x<0-this.radius)this.x=gameCanvas.width+this.radius;if(this.x>gameCanvas.width+this.radius)this.x=0-this.radius;if(this.y<0-this.radius)this.y=gameCanvas.height+this.radius;if(this.y>gameCanvas.height+this.radius)this.y=0-this.radius;if(this.invincible&&!this.shieldActive){this.invincibilityTime--;if(this.invincibilityTime<=0){this.invincible=false;this.blinkOn=true;}}if(this.shieldActive){this.shieldTimer--;if(this.shieldTimer<=0){this.shieldActive=false;this.invincible=true;this.invincibilityTime=1*FPS;this.blinkOn=true;}}}
    shoot(){if(this.canShoot&&bullets.length<BULLET_MAX&&!this.dead){bullets.push(new Bullet(this.x,this.y,this.angle));this.canShoot=false;setTimeout(()=>{if(this&&!this.dead)this.canShoot=true;},250);}}
    explode(){if(this.shieldActive)this.shieldActive=false;this.dead=true;lives--;if(originalLivesDisplay)updateLivesDisplay();shipExplosionParticles=[];const nP=10;for(let i=0;i<nP;i++)shipExplosionParticles.push(new Particle(this.x,this.y,SHIP_PARTICLE_SPEED,SHIP_EXPLOSION_DUR,"white",SHIP_SIZE/2,1));if(lives>0)setTimeout(resetShip,2000);else originalGameOver("GAME OVER");}
    activateShield(){this.shieldActive=true;this.shieldTimer=SHIELD_MAX_TIME;this.invincible=false;}
};
let Bullet = class { constructor(x,y,a){const nF=1.5;const R=SHIP_SIZE/2;this.x=x+R*nF*Math.cos(a);this.y=y-R*nF*Math.sin(a);this.radius=2;this.vel={x:BULLET_SPEED*Math.cos(a),y:-BULLET_SPEED*Math.sin(a)};this.lifespan=0.8*FPS;} draw(){if(!ctx)return;ctx.fillStyle='white';ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();} update(){this.x+=this.vel.x;this.y+=this.vel.y;this.lifespan--;}};
let Asteroid = class { constructor(x,y,s,c){this.x=x||(gameCanvas?Math.random()*gameCanvas.width:100);this.y=y||(gameCanvas?Math.random()*gameCanvas.height:100);this.size=s;this.radius=this.getRadius();this.angle=Math.random()*Math.PI*2;const sM=1+(round-1)*0.05;this.vel={x:(Math.random()*ASTEROID_SPEED*2-ASTEROID_SPEED)*sM,y:(Math.random()*ASTEROID_SPEED*2-ASTEROID_SPEED)*sM};this.vertices=Math.floor(Math.random()*5+8);this.offsets=[];for(let i=0;i<this.vertices;i++)this.offsets.push(Math.random()*this.radius*0.4-this.radius*0.2);this.chargeDisplayed=c;this.isFragment=c===null;} getRadius(){if(this.size==="large")return ASTEROID_SIZE_LARGE/2;if(this.size==="medium")return ASTEROID_SIZE_MEDIUM/2;return 0;} draw(){if(!ctx)return;ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<this.vertices;i++){const a=(Math.PI*2/this.vertices)*i,r=this.radius+this.offsets[i],xP=this.x+r*Math.cos(a),yP=this.y+r*Math.sin(a);if(i===0)ctx.moveTo(xP,yP);else ctx.lineTo(xP,yP);}ctx.closePath();ctx.stroke();if(this.chargeDisplayed!==null){ctx.fillStyle="white";let fS=this.radius*0.6;ctx.font=`bold ${fS}px 'Courier New', Courier, monospace`;ctx.textAlign="center";ctx.textBaseline="middle";let cT=this.chargeDisplayed>0?`+${this.chargeDisplayed}`:`${this.chargeDisplayed}`;if(this.chargeDisplayed===0)cT="0";ctx.fillText(cT,this.x,this.y);}} update(){if(!gameCanvas)return;this.x+=this.vel.x;this.y+=this.vel.y;if(this.x<0-this.radius)this.x=gameCanvas.width+this.radius;if(this.x>gameCanvas.width+this.radius)this.x=0-this.radius;if(this.y<0-this.radius)this.y=gameCanvas.height+this.radius;if(this.y>gameCanvas.height+this.radius)this.y=0-this.radius;} breakApart(){let nA=[];if(this.size==="large"){nA.push(new Asteroid(this.x,this.y,"medium",null));nA.push(new Asteroid(this.x,this.y,"medium",null));}return nA;}};
let UfoBullet = class { constructor(x,y,a){this.x=x;this.y=y;this.radius=2.5;this.vel={x:UFO_BULLET_SPEED*Math.cos(a),y:UFO_BULLET_SPEED*Math.sin(a)};this.color="white";} draw(){if(!ctx)return;ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();} update(){this.x+=this.vel.x;this.y+=this.vel.y;}};
let Ufo = class { constructor(){this.radius=UFO_RADIUS;this.x=gameCanvas?(Math.random()<0.5?0-this.radius:gameCanvas.width+this.radius):0;this.y=gameCanvas?(Math.random()*(gameCanvas.height*0.6)+gameCanvas.height*0.1):0;this.velX=(this.x<(gameCanvas?gameCanvas.width/2:200)?1:-1)*UFO_SPEED;this.velY=(Math.random()-0.5)*(UFO_SPEED/2);this.shootCooldown=UFO_SHOOT_COOLDOWN/2;this.color="white";this.timeAlive=0;this.maxTimeAlive=(gameCanvas?gameCanvas.width/UFO_SPEED:200/UFO_SPEED)*1.5;this.dead=false;} draw(){if(this.dead||!ctx)return;ctx.strokeStyle=this.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(this.x,this.y,this.radius,this.radius*0.6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(this.x,this.y-this.radius*0.3,this.radius*0.7,Math.PI,0,false);ctx.stroke();ctx.beginPath();ctx.moveTo(this.x-this.radius*0.7,this.y-this.radius*0.3);ctx.lineTo(this.x+this.radius*0.7,this.y-this.radius*0.3);ctx.stroke();} update(){if(this.dead||!gameCanvas)return;this.x+=this.velX;this.y+=this.velY;this.timeAlive++;if(this.y-this.radius<0&&this.velY<0||this.y+this.radius>gameCanvas.height&&this.velY>0)this.velY*=-1;this.shootCooldown--;if(this.shootCooldown<=0&&ship&&!ship.dead){this.shoot();this.shootCooldown=UFO_SHOOT_COOLDOWN+Math.random()*(FPS/2)-(FPS/4);}if((this.velX>0&&this.x>gameCanvas.width+this.radius*2)||(this.velX<0&&this.x<0-this.radius*2)||this.timeAlive>this.maxTimeAlive)ufo=null;} shoot(){if(!ship||ship.dead)return;const aTS=Math.atan2(ship.y-this.y,ship.x-this.x);ufoBullets.push(new UfoBullet(this.x,this.y,aTS));} explode(){this.dead=true;ufoExplosionParticles=[];const nP=8;for(let i=0;i<nP;i++)ufoExplosionParticles.push(new Particle(this.x,this.y,UFO_PARTICLE_SPEED,UFO_EXPLOSION_DUR,"white",UFO_RADIUS*0.8,1));powerUps.push(new PowerUpItem(this.x,this.y,"S"));ufo=null;}};

let setUfoSpawnTimer = function() { ufoSpawnTimer = Math.random() * (UFO_SPAWN_TIME_MAX - UFO_SPAWN_TIME_MIN) + UFO_SPAWN_TIME_MIN; }

function originalStartGameLogic() {
    if(!gameCanvas || !ctx) { console.error("Canvas oder Context nicht initialisiert in originalStartGameLogic"); return; }
    initializeOriginalDOMElements(); adaptCanvasSize(); gameRunning=true;
    originalNewGame();
    if(messageOverlay) messageOverlay.style.display='none';
    originalGameLoop();
}

function originalNewGame() {
    round = 0; elementsCorrectThisRound = 0; lives = GAME_LIVES; score = 0;
    if(originalScoreDisplay) updateScoreDisplay(); if(originalLivesDisplay) updateLivesDisplay();
    shipExplosionParticles = []; ufoExplosionParticles = []; powerUps = []; ufo = null; ufoBullets = [];
    createGameStars();
    setUfoSpawnTimer(); ship = new Ship(); originalStartNewMainRound();
}

let selectNextElementOnly = function() {
    if (!gameCanvas) return;
    if (typeof chemicalElements === 'undefined' || chemicalElements.length === 0) { console.error("chemicalElements not usable in selectNextElementOnly"); originalShowMessage("Fehler: Elementdaten nicht geladen!", 2); return; }
    currentChemicalElement = chemicalElements[Math.floor(Math.random() * chemicalElements.length)];
    currentCorrectCharge = currentChemicalElement.charge;
    if (originalCurrentElementNameDisplay) originalCurrentElementNameDisplay.textContent = currentChemicalElement.symbol;
    originalShowMessage(`NÄCHSTES ELEMENT: ${currentChemicalElement.symbol}`, 1.5);
};

function originalStartNewMainRound() {
    round++; elementsCorrectThisRound = 0;
    if(originalRoundDisplay) updateRoundDisplay();
    if (typeof chemicalElements === 'undefined' || !Array.isArray(chemicalElements) || chemicalElements.length === 0) {
        console.error("chemicalElements not usable in originalStartNewMainRound or empty. Value:", chemicalElements);
        originalShowMessage("Fehler: Elementdaten nicht geladen für neue Runde!", 3); gameRunning = false; return;
    }
    if (ship) { ship.invincible = true; ship.invincibilityTime = SHIP_INVINCIBILITY_DUR * FPS; ship.blinkOn = true; ship.shieldActive = false; ship.shieldTimer = 0;
        ship.x = gameCanvas ? gameCanvas.width / 2 : 200; ship.y = gameCanvas ? gameCanvas.height / 2 : 150; ship.vel = {x: 0, y: 0};
    }
    ufo = null; ufoBullets = []; powerUps = []; setUfoSpawnTimer();
    currentChemicalElement = chemicalElements[Math.floor(Math.random() * chemicalElements.length)];
    currentCorrectCharge = currentChemicalElement.charge;
    if (originalCurrentElementNameDisplay) originalCurrentElementNameDisplay.textContent = currentChemicalElement.symbol;
    originalCreateInitialAsteroidsWithCharges();
    originalShowMessage(`RUNDE ${round} START! ${currentChemicalElement.symbol}?`, 2);
}

function originalCreateInitialAsteroidsWithCharges() { if(!gameCanvas) return; asteroids = []; for (const charge of POSSIBLE_CHARGES) { originalSpawnNewAsteroidWithCharge(charge); } }
function originalSpawnNewAsteroidWithCharge(chargeToSpawn) { if(!gameCanvas || !ship) return; let x, y; const side = Math.floor(Math.random() * 4); const margin = ASTEROID_SIZE_LARGE / 2 + 10; switch(side) { case 0: x = Math.random() * gameCanvas.width; y = 0 - margin; break; case 1: x = gameCanvas.width + margin; y = Math.random() * gameCanvas.height; break; case 2: x = Math.random() * gameCanvas.width; y = gameCanvas.height + margin; break; case 3: x = 0 - margin; y = Math.random() * gameCanvas.height; break; } asteroids.push(new Asteroid(x, y, "large", chargeToSpawn)); }
let resetShip = function() { if (lives > 0) { ship = new Ship(); shipExplosionParticles = []; ship.shieldActive = false; ship.shieldTimer = 0; } };

function checkCollisions() {
    // Kugel vs Asteroid (Spieler)
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i]) continue;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (!asteroids[j]) continue;
            if (distBetweenPoints(bullets[i].x, bullets[i].y, asteroids[j].x, asteroids[j].y) < bullets[i].radius + asteroids[j].radius) {
                const wasChargeAsteroid = asteroids[j].chargeDisplayed !== null && asteroids[j].size === "large";
                const originalCharge = asteroids[j].chargeDisplayed;
                const asteroidWasFragment = asteroids[j].isFragment;
                if (wasChargeAsteroid) {
                    if (originalCharge === currentCorrectCharge) {
                        score += 10; elementsCorrectThisRound++;
                        if(originalScoreDisplay) updateScoreDisplay();
                        asteroids.splice(j, 1); bullets.splice(i, 1);
                        originalSpawnNewAsteroidWithCharge(originalCharge);
                        if (elementsCorrectThisRound >= ELEMENTS_PER_ROUND) {
                            gameRunning = false;
                            originalShowMessage(`RUNDE ${round} GESCHAFFT!`, 2.5);
                            setTimeout(() => { originalStartNewMainRound(); gameRunning = true; }, 2600);
                        } else {
                            originalShowMessage("RICHTIG!", 1);
                            setTimeout(() => { selectNextElementOnly(); }, 1100);
                        }
                    } else {
                        score -= 3; if(originalScoreDisplay) updateScoreDisplay();
                        originalShowMessage("FALSCH!", 1);
                        const nA = asteroids[j].breakApart(); asteroids.splice(j, 1, ...nA);
                        bullets.splice(i, 1);
                        originalSpawnNewAsteroidWithCharge(originalCharge);
                    }
                } else if (asteroidWasFragment && asteroids[j].size === "medium") {
                    asteroids.splice(j, 1); bullets.splice(i, 1);
                }
                break;
            }
        }
    }
    // UFO Kugel vs Asteroid (NEU)
    for (let i = ufoBullets.length - 1; i >= 0; i--) {
        if (!ufoBullets[i]) continue;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (!asteroids[j]) continue;
            if (distBetweenPoints(ufoBullets[i].x, ufoBullets[i].y, asteroids[j].x, asteroids[j].y) < ufoBullets[i].radius + asteroids[j].radius) {
                ufoBullets.splice(i, 1); // UFO-Kugel entfernen
                // Asteroid wird NICHT zerstört
                break; // UFO-Kugel kann nur einen Asteroiden pro Frame treffen
            }
        }
    }

    if (ship && !ship.dead) {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            if (distBetweenPoints(ship.x, ship.y, powerUps[i].x, powerUps[i].y) < ship.radius + powerUps[i].radius) {
                if (powerUps[i].type === "S") ship.activateShield();
                powerUps.splice(i, 1); break;
            }
        }
    }
    if (ship && ship.shieldActive) {
        for (let i = asteroids.length - 1; i >= 0; i--) {
            if (!asteroids[i]) continue;
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.shieldRadius + asteroids[i].radius) {
                if (asteroids[i].chargeDisplayed !== null) {
                    const originalChargeOfShieldDestroyed = asteroids[i].chargeDisplayed;
                    asteroids.splice(i, 1); originalSpawnNewAsteroidWithCharge(originalChargeOfShieldDestroyed);
                } else { asteroids.splice(i, 1); }
            }
        }
        if (ufo && !ufo.dead && distBetweenPoints(ship.x, ship.y, ufo.x, ufo.y) < ship.shieldRadius + ufo.radius) {
            score += UFO_POINTS; if(originalScoreDisplay) updateScoreDisplay(); ufo.explode();
        }
        for (let i = ufoBullets.length - 1; i >= 0; i--) {
            if (distBetweenPoints(ship.x, ship.y, ufoBullets[i].x, ufoBullets[i].y) < ship.shieldRadius + ufoBullets[i].radius) {
                ufoBullets.splice(i, 1);
            }
        }
    }
    else if (ship && !ship.dead && !ship.invincible) {
        for (let i = 0; i < asteroids.length; i++) {
            if (!asteroids[i]) continue;
            if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
                ship.explode(); break;
            }
        }
        if (ufo && !ufo.dead && distBetweenPoints(ship.x, ship.y, ufo.x, ufo.y) < ship.radius + ufo.radius) {
            ship.explode(); if (ufo && !ufo.dead) ufo.explode();
        }
    }
    if (ship && !ship.dead && !ship.invincible && !ship.shieldActive) {
        for (let i = ufoBullets.length - 1; i >= 0; i--) {
            if (!ufoBullets[i]) continue;
            if (distBetweenPoints(ufoBullets[i].x, ufoBullets[i].y, ship.x, ship.y) < ufoBullets[i].radius + ship.radius) {
                ship.explode(); ufoBullets.splice(i, 1); break;
            }
        }
    }
    if (ufo && !ufo.dead) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i]) continue;
            if (distBetweenPoints(bullets[i].x, bullets[i].y, ufo.x, ufo.y) < bullets[i].radius + ufo.radius) {
                score += UFO_POINTS; if(originalScoreDisplay) updateScoreDisplay(); ufo.explode(); bullets.splice(i, 1); break;
            }
        }
    }
};

let updateScoreDisplay = function() { if(originalScoreDisplay) originalScoreDisplay.textContent = `SCORE: ${score}`; }
let updateLivesDisplay = function() { if(originalLivesDisplay) originalLivesDisplay.textContent = `LIVES: ${lives}`; }
let updateRoundDisplay = function() { if(originalRoundDisplay) originalRoundDisplay.textContent = `RUNDE: ${round}`; }

function originalShowMessage(text, duration = TEXT_FADE_TIME) {
    if(!messageText || !restartButtonFromGameOver || !messageOverlay) return;
    messageText.textContent = text;
    restartButtonFromGameOver.style.display = 'none';
    messageOverlay.style.display = 'flex'; messageOverlay.style.opacity = 1;
    if (duration > 0) {
        setTimeout(() => { let op = 1; const fI = setInterval(() => { op -= 0.05; messageOverlay.style.opacity = op; if (op <= 0) { clearInterval(fI); messageOverlay.style.display = 'none'; } }, 25); }, (duration - 0.5) * 1000);
    }
}

function originalGameOver(message) {
    if (ship) ship.dead = true;
    gameRunning = false;
    handlePlayerDefeat(score);
    if(messageText && restartButtonFromGameOver && messageOverlay) {
        const baseFontSizeMessage = 36; const gameOverFontSize = baseFontSizeMessage * 0.7; const scoreFontSize = baseFontSizeMessage * 0.5;
        messageText.innerHTML = `<span style="font-size:${gameOverFontSize}px;">${message}</span><br><span style="font-size:${scoreFontSize}px;">SCORE: ${score}</span>`;
        restartButtonFromGameOver.textContent = "NEUSTART"; restartButtonFromGameOver.style.display = 'block';
        messageOverlay.style.opacity = 1; messageOverlay.style.display = 'flex';
    }
    if(ufo && !ufo.dead) ufo.explode(); else ufo = null;
    ufoBullets = []; powerUps = [];
}

function originalGameLoop() {
    if (!ctx || !gameCanvas) { console.warn("GameLoop: Canvas oder Context nicht bereit."); return; }
    let activeAnimations = shipExplosionParticles.length > 0 || ufoExplosionParticles.length > 0 || powerUps.length > 0 || (ufo && !ufo.dead) || ufoBullets.length > 0;
    if (!gameRunning && !activeAnimations) { return; }
    for(let i=shipExplosionParticles.length-1;i>=0;i--){shipExplosionParticles[i].update();if(shipExplosionParticles[i].alpha<=0)shipExplosionParticles.splice(i,1);}
    for(let i=ufoExplosionParticles.length-1;i>=0;i--){ufoExplosionParticles[i].update();if(ufoExplosionParticles[i].alpha<=0)ufoExplosionParticles.splice(i,1);}
    for(let i=powerUps.length-1;i>=0;i--){powerUps[i].update();if(powerUps[i].lifespan<=0)powerUps.splice(i,1);}

    ctx.clearRect(0,0,gameCanvas.width,gameCanvas.height);
    drawGameStars();

    if (!gameRunning) {
        powerUps.forEach(p=>p.draw());shipExplosionParticles.forEach(p=>p.draw());ufoExplosionParticles.forEach(p=>p.draw());
        if(ufo&&!ufo.dead)ufo.draw();ufoBullets.forEach(b=>b.draw());
        asteroids.forEach(a=>a.draw());
        if(ship && !ship.dead) ship.draw();
        requestAnimationFrame(originalGameLoop); return;
    }
    if(!ufo&&ufoExplosionParticles.length===0){ufoSpawnTimer--;if(ufoSpawnTimer<=0&&asteroids.length>0){ufo=new Ufo();setUfoSpawnTimer();}}else if(ufo&&!ufo.dead){ufo.update();}
    ufoBullets.forEach((b,idx)=>{b.update();if(b.x<0||b.x>gameCanvas.width||b.y<0||b.y>gameCanvas.height)ufoBullets.splice(idx,1);});
    if(ship&&!ship.dead){if(keys.Space&&ship.canShoot){ship.shoot();}if(touchState.fire&&touchState.canFire){ship.shoot();touchState.canFire=false;}ship.update();}
    bullets.forEach(b=>b.update());asteroids.forEach(a=>a.update());
    bullets=bullets.filter(b=>b.lifespan>0&&b.x>-b.radius&&b.x<gameCanvas.width+b.radius&&b.y>-b.radius&&b.y<gameCanvas.height+b.radius);
    checkCollisions();

    powerUps.forEach(p=>p.draw());
    if(ship)ship.draw();bullets.forEach(b=>b.draw());asteroids.forEach(a=>a.draw());
    shipExplosionParticles.forEach(p=>p.draw());ufoExplosionParticles.forEach(p=>p.draw());
    if(ufo&&!ufo.dead)ufo.draw();ufoBullets.forEach(b=>b.draw());

    requestAnimationFrame(originalGameLoop);
}
