(function() {

//-------------------------------------------------------------------------
// GAME CONSTANTS AND VARIABLES
//-------------------------------------------------------------------------

var MAP      = { tw: 24, th: 16 },
    TILE     = 32,
    METER    = TILE,
    GRAVITY  = 9.8 * 4, // default (exagerated) gravity
    MAXDX    = 8,      // default max horizontal speed (8 tiles per second)
    MAXDY    = 60,      // default max vertical speed   (60 tiles per second)
    ACCEL    = 1/2,     // default take 1/2 second to reach maxdx (horizontal acceleration)
    FRICTION = 1/6,     // default take 1/6 second to stop from maxdx (horizontal friction)
    IMPULSE  = 1000,    // default player jump impulse
    KEY      = { SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 }; // keyboard keycodes

var fps      = 60,
    step     = 1/fps,
    canvas_static  = document.getElementById('game_static'),
    canvas_dynamic = document.getElementById('game_dynamic'),
    ui_container   = document.getElementById('game_ui'),
    ctx_static  = canvas_static.getContext('2d'),
    ctx_dynamic = canvas_dynamic.getContext('2d'),
    width    = canvas_static.width  = canvas_dynamic.width  = MAP.tw * TILE,
    height   = canvas_static.height  = canvas_dynamic.height = MAP.th * TILE,
    player   = {},
    monsters = [],
    treasure = [],
    cTiles   = [],     // collision tiles
    bg1Tiles = [],    
    bg2Tiles = [], 
    bg3Tiles = [];
var gamePaused = false;
var saveProg = true;


//_______Sounds_________
// 
    
var themeMusic = new Howl({
    urls: ['asset/sounds/theme.wav'],
    //autoplay: true,
    loop: true,
    volume: 0.1,
});
var jumpSound = new Howl({
    urls: ['asset/sounds/jump.wav'],
    volume: 0.1,
});
var ow = new Howl({
    urls: ['asset/sounds/ow.mp3'],
    volume: 0.1,
});
var beer = new Howl({
    urls: ['asset/sounds/beer.mp3'],
    volume: 0.1,
});
var fadeInTime = 1000; // in ms
var playSound = true;

//_______Sprites_________
// 

var spritesheet = new Image();
spritesheet.src = "asset/sprites/spritesheet_combined.png";

// Starting sprites

    
var playerCenter = 1141,
    playerRight = [1104, 1103, 1105],
    playerLeft = [1178, 1177, 1179];
    
var monsterRight = [1467, 1468],
    monsterLeft = [1504, 1505],
    monsterDead = 1469;

var playerSprite = playerCenter,
    monsterSprite = monsterRight[0],
    treasureSprite = 1214,
    emptyTreasureSprite = 1215,
    heartSprite = 1493,
    halfHeartSprite = 1494,
    emptyHeartSprite = 1495;


//_______UI Elements_________

    
var w = ui_container.width = window.innerWidth;
var h = ui_container.height = window.innerHeight;

function uiElement(name, x, y, width, height){ //maybe add onpress function, name
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    this.container = document.createElement("div");
    this.container.id = name;
    //this.container.style.backgroundColor = "yellow";
    this.container.style.position = "absolute";
    this.container.style.width = width + "px";
    this.container.style.height = height + "px";
    this.container.style.left = x + "px";
    this.container.style.top = y + "px";
    this.container.style.zIndex = 5;
    
    this.image = document.createElement("IMG");
    (this.image).src = "asset/ui/" + name + ".png";
    this.image.style.width = "100%";
    this.image.style.height = "100%";
    this.container.name = name;
    this.container.appendChild(this.image);   
    document.getElementById('game_ui').appendChild(this.container);
    
    this.update = function() {
        this.container.style.width = this.width + "px";
        this.container.style.height = this.height + "px";
        this.container.style.left = this.x + "px";
        this.container.style.top = this.y + "px";
    }
}

var size = h * .23;
var optSize = w/20;
var padding = 4;
// Create UI Elements
var upBtn = new uiElement("up", w - size - padding, h - size - padding, size, size);
var leftBtn = new uiElement("left", padding, h - size - padding, size, size);
var rightBtn = new uiElement("right", 3 * padding + size, h - size - padding, size, size);
    
var soundBtn = new uiElement("sound", w/2 - optSize - padding, h - optSize - padding, optSize, optSize);
var pauseBtn = new uiElement("pause", w/2 + padding, h - optSize - padding, optSize, optSize);
var restartBtn = new uiElement("restart", padding, padding, optSize, optSize);


    
var splashscreen = new uiElement("splashscreen", 0, 0, w, h);


//_______Other_________
// 
var currentMap;
var currentLevel;
var screenState;
var MAX_LIVES = 6;
var playerLives = MAX_LIVES;
var lastLevel = 10;

var playerColBuff = 0;

var showFPS = false;

var t2p      = function(t)     { return t*TILE;                     },
    p2t      = function(p)     { return Math.floor(p/TILE);         };

function cell(x,y, layer) { 
    return tcell(p2t(x),p2t(y), layer);  
}

function tcell(tx,ty, layer) {
    switch(layer){
        case "col":
            return cTiles[tx + (ty*MAP.tw)]; 
            break;
        case "bg1":
            return bg1Tiles[tx + (ty*MAP.tw)]; 
            break;
        case "bg2":
            return bg2Tiles[tx + (ty*MAP.tw)]; 
            break;
        case "bg3":
            return bg3Tiles[tx + (ty*MAP.tw)]; 
            break;
        default:
            return null;
            break;
    }
}

//-------------------------------------------------------------------------
// UPDATE LOOP
//-------------------------------------------------------------------------

function onkey(ev, key, down) {
    switch(key) {
        case KEY.LEFT:  player.left  = down; ev.preventDefault(); return false;
        case KEY.RIGHT: player.right = down; ev.preventDefault(); return false;
        case KEY.SPACE: player.jump  = down; ev.preventDefault(); return false;
    }
}

function update(dt) {
    updatePlayer(dt);
    updateMonsters(dt);
    checkTreasure();
}

var rightFrame = 0, leftFrame = 0;
function updatePlayer(dt) {
    var advSprite = false;
    if (counter % 5 == 0 && !player.jumping) advSprite = true;
    
    if (!player.right && !player.left) {
        playerSprite = playerCenter;
        rightFrame = leftFrame = 0;
    } 
    else if (player.right && advSprite) playerSprite = playerRight[rightFrame++ % playerRight.length];
    else if (player.left && advSprite) playerSprite = playerLeft[leftFrame++ % playerLeft.length];
    
    
    // check goal and collected treasure
    if (overlap(player.x, player.y, TILE, TILE, currentMap.properties.goalTx * TILE, currentMap.properties.goalTy * TILE, TILE, TILE) && player.collected >= treasure.length) {
        console.log("GOAL REACHED!");
        if (currentLevel == lastLevel) {
            splashscreen.image.src = "asset/splashscreen/win.gif";
            restartGame();
            screenState = 3;
            unfade(splashscreen.container);
            
        }
        else
            nextLevel();
    }
    updateEntity(player, dt);
}

function updateMonsters(dt) {
    var n, max;
    for(n = 0, max = monsters.length ; n < max ; n++)
        updateMonster(monsters[n], dt);
}

function updateMonster(monster, dt) {
    if (!monster.dead) {
        updateEntity(monster, dt);
        if (counter % 5 == 0) monster.frame++;
        if (playerOverlap(monster.x, monster.y, TILE, TILE)) {
            if ((player.dy > 0) && (monster.y - player.y > TILE/2))
                killMonster(monster);
            else killPlayer(player);
        }
    }
}

function checkTreasure() {
    var n, max, t;
    for(n = 0, max = treasure.length ; n < max ; n++) {
        t = treasure[n];
        if (!t.collected && playerOverlap(t.x, t.y, TILE, TILE))
            collectTreasure(t);
    }
}

function killMonster(monster) {
    player.killed++;
    monster.dead = true;
}

function killPlayer(player) {
    if (playSound) ow.play();
    playerLives--;
    player.x = player.start.x;
    player.y = player.start.y;
    player.dx = player.dy = 0;
    saveGameState();
    if (playerLives <= 0) restartGame();
}
    
function restartGame() {
    player.x = 1000;
	player.y = 1000;
	monsters = [],
    treasure = [],
    cTiles   = [],
    bg1Tiles  = [],
    bg2Tiles  = [],
    bg3Tiles  = [];
	playerLives = MAX_LIVES;
    currentLevel = 1;
    if (saveProg) saveGameState();
    startGame(); //send back to level 1
}

function playerOverlap(x, y, width, height){
    return overlap(player.x + playerColBuff , player.y + playerColBuff, TILE - playerColBuff * 2, TILE - playerColBuff* 2, x, y, width, height);
}

function collectTreasure(t) {
    if (playSound) beer.play();
    player.collected++;
    t.collected = true;
}

function updateEntity(entity, dt) {
    var wasleft    = entity.dx  < 0,
        wasright   = entity.dx  > 0,
        falling    = entity.falling,
        friction   = entity.friction * (falling ? 0.5 : 1),
        accel      = entity.accel    * (falling ? 0.5 : 1);

    entity.ddx = 0;
    entity.ddy = entity.gravity;

    if (entity.left)
        entity.ddx = entity.ddx - accel;
    else if (wasleft)
        entity.ddx = entity.ddx + friction;

    if (entity.right)
        entity.ddx = entity.ddx + accel;
    else if (wasright)
        entity.ddx = entity.ddx - friction;

    if (entity.jump && !entity.jumping && !falling) {
        if (playSound) jumpSound.play();		  // jumpSound must go here to avoid firing inappropriately
        entity.ddy = entity.ddy - entity.impulse; // an instant big force impulse   
        entity.jumping = true;
    }

    entity.x  = entity.x  + (dt * entity.dx);
    entity.y  = entity.y  + (dt * entity.dy);
    entity.dx = bound(entity.dx + (dt * entity.ddx), -entity.maxdx, entity.maxdx);
    entity.dy = bound(entity.dy + (dt * entity.ddy), -entity.maxdy, entity.maxdy);


    if ((wasleft  && (entity.dx > 0)) || (wasright && (entity.dx < 0))) {
        entity.dx = 0; // clamp at zero to prevent friction from making us jiggle side to side
    }

    var tx        = p2t(entity.x),          //tile containing player
        ty        = p2t(entity.y),
        nx        = entity.x % TILE,          //depth of player into tile 
        ny        = entity.y % TILE,
        cell      = tcell(tx, ty, 'col'),      //index of tile containing player
        cellright = tcell(tx + 1, ty, 'col'),      //index of tile right of player
        cellleft  = tcell(tx - 1, ty, 'col'),
        celldown  = tcell(tx,     ty + 1, 'col'),  //index of tile below player
        celldiag  = tcell(tx + 1, ty + 1, 'col'),  //index of tile down and right of player
        celldiagL = tcell(tx - 1, ty + 1, 'col');


    if (entity.dy > 0) { // if falling
        if ((celldown && !cell) || (celldiag && !cellright && nx)) {
            entity.y = t2p(ty);
            entity.dy = 0;
            entity.falling = false;
            entity.jumping = false;
            ny = 0;
        }
    }
    else if (entity.dy < 0) { // if jumping
        if ((cell && !celldown) || (cellright && !celldiag && nx)) {
            entity.y = t2p(ty + 1);
            entity.dy = 0;
            cell      = celldown;
            cellright = celldiag;
            ny        = 0;
        }
    }

    if (entity.dx > 0) {
        if ((cellright && !cell) || (celldiag  && !celldown && ny) || (entity.x + TILE >= MAP.tw * TILE)) {
            entity.x = t2p(tx);
            entity.dx = 0;
        }
    } 
    else if (entity.dx < 0) {
        if ((cell && !cellright) || (celldown && !celldiag && ny) || (entity.x < 0)) {
            entity.x = t2p(tx + 1);
            entity.dx = 0;
        }
    }

    if (entity.monster) {
        if (entity.left && (cell || !celldown)) {
            entity.left = false;
            entity.right = true;
        }      
        else if (entity.right && (cellright || !celldiag)) {
            entity.right = false;
            entity.left  = true;
        }
    }

    entity.falling = ! (celldown || (nx && celldiag));

    if (entity.player){
        if (!falling && (celldiag) && !celldown && (nx < TILE * 7.0/32.0) && !cellright && (entity.x > 2)) { // butter
                    entity.x = entity.x - 1;		                
                }
        else if ((cellright || !celldiag) && (nx > TILE * 23.0/32.0) && !falling && celldown) {
            entity.x = entity.x + 1;
        }
    }
}

//-------------------------------------------------------------------------
// RENDERING
//-------------------------------------------------------------------------

function render(frame, dt) {
    ctx_dynamic.clearRect(0, 0, width, height);
    
    renderTreasure(ctx_dynamic, frame);
    renderPlayer(ctx_dynamic, dt, frame);
    renderMonsters(ctx_dynamic, dt);
    renderScores(ctx_dynamic);
    
    if (counter % 30 == 0) {
        ctx_static.clearRect(0, 0, width, height);
        renderMap(ctx_static);
    }
}

function renderMap(ctx) {
    //console.log("RENDERING MAP");
    var x, y, cTile, bg1Tile, bg2Tile, bg3Tile;
    for(y = 0 ; y < MAP.th ; y++) {
        for(x = 0 ; x < MAP.tw ; x++) {
            cTile = tcell(x, y, 'col');
            bg1Tile = tcell(x, y, 'bg1');
            bg2Tile = tcell(x, y, 'bg2');
            bg3Tile = tcell(x, y, 'bg3');
            // order below is important
            if (bg3Tile) drawSprite(bg3Tile - 1, x * TILE, y * TILE, ctx);
            if (bg2Tile) drawSprite(bg2Tile - 1, x * TILE, y * TILE, ctx);
            if (bg1Tile) drawSprite(bg1Tile - 1, x * TILE, y * TILE, ctx);
            if (cTile) drawSprite(cTile - 1, x * TILE, y * TILE, ctx);
        }
    } 
}

function renderPlayer(ctx, dt, frame) {
    drawSprite(playerSprite, player.x, player.y, ctx);
    //ctx.fillRect(player.x +  playerColBuff, player.y + playerColBuff, TILE - playerColBuff * 2, TILE - playerColBuff * 2);
}

function renderScores(ctx){
    var n, max;
    var x = MAP.tw /2 + 3, y = MAP.th - 3; // tile location to start top right

    var scale = .75;
    var size = TILE * scale;
    x = 24
    
    x = MAP.tw / 2 - 5, y = MAP.th - 3;
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Lives:", t2p(x), t2p(y) - 5);
    ctx.fillText("Level : " + currentLevel + "/" + lastLevel, t2p(x), t2p(y + 2));
    //Draw lives
    for(n = 0; n < Math.floor(MAX_LIVES / 2) ; n++){
        drawSpriteScaled(emptyHeartSprite, t2p(x) + n * size, t2p(y), size, size, ctx);
    }
    for(n = 0; n < Math.floor(playerLives / 2) ; n++){
        drawSpriteScaled(heartSprite, t2p(x) + n * size, t2p(y), size, size, ctx);
    }
    if (playerLives % 2 != 0)
        drawSpriteScaled(halfHeartSprite, t2p(x) + n * size, t2p(y), size, size, ctx);
    
    x = MAP.tw /2 + 2; 
    // Draw collected treasure
    for(n = 0, max = player.collected ; n < treasure.length ; n++){
        if(n < max)
            drawSpriteScaled(treasureSprite, t2p(x) + n * size, t2p(y), size, size, ctx);
        else
            drawSpriteScaled(emptyTreasureSprite, t2p(x) + n * size, t2p(y), size, size, ctx);
    }
    // Draw slain monsters
    y = MAP.th - 2;
    i = 0;
    for(n = 0, max = player.killed ; n < max ; n++, i++) {
        if (n != 0 && n % 8 == 0) {
            i = 0;
            y++;
        }
        drawSpriteScaled(monsterSprite, t2p(x) + i * size, t2p(y), size, size, ctx); 
    }
    
}

function renderMonsters(ctx, dt) {
    var dt = dt;
    dt = 0; // disable  *dt to prevent jitter on pause
    var n, max, monster;
    for(n = 0, max = monsters.length ; n < max ; n++) {
        monster = monsters[n];
        if (!monster.dead){
            
            if (monster.frame % 2 == 0) {
                monsterSprite = monster.left ? monsterLeft[0] : monsterRight[0];
            }
            else {
                monsterSprite = monster.left ? monsterLeft[1] : monsterRight[1];
            }
            drawSprite(monsterSprite, monster.x + (monster.dx * dt), monster.y + (monster.dy * dt), ctx);
        }
    }

}

function renderTreasure(ctx, frame) {
    ctx.globalAlpha = 0.25 + tweenTreasure(frame, 60);
    var n, max, t;
    for(n = 0, max = treasure.length ; n < max ; n++) {
        t = treasure[n];
        if (!t.collected)
            drawSprite(treasureSprite, t.x, t.y, ctx);
    }
    ctx.globalAlpha = 1;
}

function tweenTreasure(frame, duration) {
    var half  = duration/2
    var pulse = frame % duration;
    return pulse < half ? (pulse/half) : 1-(pulse-half)/half;
}

function drawSprite(tileNum, x , y, ctx){
    var sx = t2p(tileNum % (spritesheet.width / TILE));
    var sy = t2p(Math.floor(tileNum / (spritesheet.width / TILE)));
    ctx.drawImage(spritesheet, sx, sy, TILE, TILE, x, y, TILE, TILE);
}

function drawSpriteScaled(tileNum, x , y, width, height, ctx){
    var sx = t2p(tileNum % (spritesheet.width / TILE));
    var sy = t2p(Math.floor(tileNum / (spritesheet.width / TILE)));
    ctx.drawImage(spritesheet, sx, sy, TILE, TILE, x, y, width, height);
}


//-------------------------------------------------------------------------
// LOAD THE MAP
//-------------------------------------------------------------------------
function fadeOut(element) {
    var opacity = 1;
    var timer = setInterval(function() {
    if (opacity <= 0.1){
        clearInterval(timer);
        element.style.display = 'none';
        element.style.zIndex = 0;
    }
    element.style.opacity = opacity;
    element.style.filter = 'alpha(opacity ='+opacity*100+")";
       opacity-= opacity* 0.1;
    }, 50);  
}
    
function unfade(element) {
    element.style.zIndex = 1000;
    var op = 0.1;  // initial opacity
    element.style.display = 'block';
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 10);
}

function setup(map) {
    console.log("Loading map: " + currentLevel);
    var objects, n, obj, entity;

    currentMap = map;
    MAP.tw = map.width;
    MAP.th = map.height;
    TILE = map.tileheight;

    for(var i = 0; i < map.layers.length; i++){
        var layer = map.layers[i];
        switch (layer.name){
            case "cTiles" :
                cTiles = layer.data; break;
            case "bg1" :
                bg1Tiles = layer.data; break;
            case "bg2" :
                bg2Tiles = layer.data; break;
            case "bg3" :
                bg3Tiles = layer.data; break;
            case "objects" :
                objects = layer.objects; break;

            default :
                console.log("That layer isn't handled."); break;
        }
    }

    for(n = 0 ; n < objects.length ; n++) {
        obj = objects[n];
        entity = setupEntity(obj);
        switch(obj.type) {
            case "player": 
              player = entity; 
              break;
            case "monster": 
              entity.maxdx = METER * 3;
              entity.left = Math.random() < .5;
              entity.right = !entity.left;
              monsters.push(entity);
              break;
            case "treasure": 
              treasure.push(entity); 
              break;
        }
    }
    ctx_static.clearRect(0, 0, width, height);
    renderMap(ctx_static);
}

function setupEntity(obj) {
    var entity = {};
    entity.x        = obj.x;
    entity.y        = obj.y;
    entity.dx       = 0;
    entity.dy       = 0;
    entity.gravity  = METER * GRAVITY;
    entity.maxdx    = METER * MAXDX;
    entity.maxdy    = METER * MAXDY;
    entity.impulse  = METER * IMPULSE;
    entity.accel    = entity.maxdx / ACCEL;
    entity.friction = entity.maxdx / FRICTION;

    entity.monster  = obj.type == "monster";
    entity.player   = obj.type == "player";
    entity.treasure = obj.type == "treasure";

    entity.left     = false;
    entity.right    = false;

    entity.start    = { x: obj.x, y: obj.y }
    entity.killed   = entity.collected = 0;
    entity.frame    = 0;
    return entity;
}

function nextLevel(){
    player.x = 1000; // prevent multiple goal reached
    player.y = 1000;
    monsters = [],
    treasure = [],
    cTiles   = [],
    bg1Tiles  = [],
    bg2Tiles  = [],
    bg3Tiles  = [];

    currentLevel++;
    if (saveProg) saveGameState();
    
    get("asset/levels/level" + currentLevel + ".json", function(req) {
        setup(JSON.parse(req.responseText));
    });
}


//-------------------------------------------------------------------------
// THE GAME LOOP
//-------------------------------------------------------------------------

var counter = 0, 
    dt = 0, 
    now,
    last = timestamp(),
    fpsmeter = new FPSMeter({ decimals: 0, graph: true, theme: 'dark', left: '5px' });
if(!showFPS) fpsmeter.hide();

function frame() {
    fpsmeter.tickStart();
    now = timestamp();
    dt = dt + Math.min(1, (now - last) / 1000);
    while(dt > step) {
        dt = dt - step;
        if (!gamePaused) update(step);
    }
    render(counter, dt);
    last = now;
    counter++;
    fpsmeter.tick();

    requestAnimationFrame(frame);
}

function uiHandler(e) {
    e.preventDefault();
    var type = e.type;
    var target = e.currentTarget;
    var id = target.id;
    
    switch (id) {
        case 'right':
            if(type == 'touchstart') {
                rightBtn.image.src = "asset/ui/right_pressed.png";
                onkey(e, KEY.RIGHT, true);
            }
            else if(type == 'touchend') {
                rightBtn.image.src = "asset/ui/right.png";
                onkey(e, KEY.RIGHT, false);
            }
            break;
        case 'left':
            if(type == 'touchstart') {
                leftBtn.image.src = "asset/ui/left_pressed.png";
                onkey(e, KEY.LEFT, true);   
            }
            else if(type == 'touchend') {
                leftBtn.image.src = "asset/ui/left.png";
                onkey(e, KEY.LEFT, false);
            }
            break;
        case 'up':
            if (type == 'touchstart') {
                upBtn.image.src = "asset/ui/up_pressed.png";
                onkey(e, KEY.SPACE, true);
            }
            else if(type == 'touchend'){
                upBtn.image.src = "asset/ui/up.png";
                onkey(e, KEY.SPACE, false);	
            }
            break;
        case 'sound':
            if(type == 'touchstart') {
                playSound = !playSound;
                saveGameState();
                if(!playSound) {
                    themeMusic.fadeOut(0, fadeInTime);
                    soundBtn.image.src = "asset/ui/sound_off.png";
                } else {
                    themeMusic.fadeIn(0.1, fadeInTime);
                    soundBtn.image.src = "asset/ui/sound.png";
                }
            }
            break;
        case 'pause':
            if(type == 'touchstart') {
                gamePaused = !gamePaused;
                if(!gamePaused) {
                    pauseBtn.image.src = "asset/ui/pause.png";
                } else {
                    pauseBtn.image.src = "asset/ui/play.png";
                }
            }
            break;
        case 'restart':
            if(type == 'touchstart') {
                restartGame();
            }
            break;
        case 'splashscreen':
            if (type == "touchstart" || type == "mousedown") splashscreenHandler(e);
            break;
    }
}    

function splashscreenHandler(e) {
    console.log("screenState: " + screenState);
    switch (screenState++) {
        case 0:
            splashscreen.image.src = "asset/splashscreen/introsplash.png";
            break;
        case 1:
            splashscreen.image.src = "asset/splashscreen/story.png";
            break;
        case 2:
            splashscreen.image.src = "asset/splashscreen/howtoplay.png";
            break;
        case 3:
            fadeOut(splashscreen.container);
            break;
        case 4:
            screenState = 3;
            break;
        default:
            break;
    }
}

function addListeners() {
    document.addEventListener('keydown', function(ev) { return onkey(ev, ev.keyCode, true);  }, false);
    document.addEventListener('keyup',   function(ev) { return onkey(ev, ev.keyCode, false); }, false);
    
    document.getElementById("right").addEventListener('touchstart', uiHandler, false);
    document.getElementById("right").addEventListener('touchend', uiHandler, false);

    document.getElementById("left").addEventListener('touchstart', uiHandler, false);
    document.getElementById("left").addEventListener('touchend', uiHandler, false);

    document.getElementById("up").addEventListener('touchstart', uiHandler, false);
    document.getElementById("up").addEventListener('touchend', uiHandler, false);
  
    document.getElementById("sound").addEventListener('touchstart', uiHandler, false);
    document.getElementById("sound").addEventListener('touchend', uiHandler, false);
    
    document.getElementById("pause").addEventListener('touchstart', uiHandler, false);
    document.getElementById("pause").addEventListener('touchend', uiHandler, false);
    
    document.getElementById("restart").addEventListener('touchstart', uiHandler, false);
    document.getElementById("restart").addEventListener('touchend', uiHandler, false);
    
    document.getElementById("splashscreen").addEventListener('touchstart', uiHandler, false);
    document.getElementById("splashscreen").addEventListener('mousedown', uiHandler, false);

    document.getElementById("splashscreen").addEventListener('touchend', uiHandler, false);
    document.getElementById("splashscreen").addEventListener('mouseup', uiHandler, false);
}

function startGame() {
    console.log("_____________________________STARTING GAME_____________________________");
     if (!window.requestAnimationFrame) {
        window.requestAnimationFrame =  window.webkitRequestAnimationFrame || 
                                        window.mozRequestAnimationFrame    || 
                                        window.oRequestAnimationFrame      || 
                                        window.msRequestAnimationFrame     || 
                                        function(callback, element) {
                                            window.setTimeout(callback, 1000 / 60);
                                        }
    }    
    
    if (saveProg) loadGameState();
    screenState = (currentLevel == 1) ? 1 : 3;
    
    addListeners();
    
    if (playSound) themeMusic.fadeIn(0.1, fadeInTime);
    
    get("asset/levels/level" + currentLevel + ".json", function(req) {
        setup(JSON.parse(req.responseText));
        ctx_static.clearRect(0, 0, width, height);
        renderMap(ctx_static);
        frame();
    });
}

//-------------------------------------------------------------------------
// UTILITIES
//-------------------------------------------------------------------------
    
function saveGameState() {
    localStorage.setItem('level', currentLevel.toString());
    localStorage.setItem('lives', playerLives.toString());
    
    if (playSound)
        localStorage.setItem('playSound', "true");
    else 
        localStorage.setItem('playSound', "false");
    console.log("state saved");
}

function loadGameState() {
    // ensure value exists
    if((localStorage.getItem('level') === null) || (localStorage.getItem('level') == '11'))
        localStorage.setItem('level', '1');
    if(localStorage.getItem('lives') === null)
        localStorage.setItem('lives', MAX_LIVES.toString());
    if(localStorage.getItem('playSound') === null)
        localStorage.setItem('playSound', "true");
    
    currentLevel = parseInt(localStorage.getItem('level'));
    playerLives = parseInt(localStorage.getItem('lives'));
    playSound = localStorage.getItem('playSound') == "true" ? true : false;
    
    if(!playSound) soundBtn.image.src = "asset/ui/sound_off.png";
    console.log("state loaded");
}

function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function bound(x, min, max) {
    return Math.max(min, Math.min(max, x));
}

function get(url, onsuccess) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if ((request.readyState == 4) && (request.status == 200))
        onsuccess(request);
    }
    request.open("GET", url, true);
    request.send();
}

function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(((x1 + w1 - 1) < x2) ||
             ((x2 + w2 - 1) < x1) ||
             ((y1 + h1 - 1) < y2) ||
             ((y2 + h2 - 1) < y1))
}

startGame();

})();
