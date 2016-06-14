(function() { // module pattern
    console.log("_________________starting game_________________");

    /* TODO 
        - more levels
        - score/tally
        - handle final level
        - splash screen on start(will have done by 6/4/2016 11:59pm
    
    */
    
    //-------------------------------------------------------------------------
    // POLYFILLS
    //-------------------------------------------------------------------------
  
    if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimationFrame = window.webkitRequestAnimationFrame || 
                                   window.mozRequestAnimationFrame    || 
                                   window.oRequestAnimationFrame      || 
                                   window.msRequestAnimationFrame     || 
                                   function(callback, element) {
                                     window.setTimeout(callback, 1000 / 60);
                                   }
  }

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
        canvas   = document.getElementById('canvas'),
        ctx      = canvas.getContext('2d'),
        width    = canvas.width  = MAP.tw * TILE,
        height   = canvas.height = MAP.th * TILE,
        player   = {},
        monsters = [],
        treasure = [],
        cTiles   = [],  // collision tiles
        ncTiles  = [],  // non-collision tiles
        bTiles = [];    // background non-collision tiles

    //_______Sounds_________
   // 

    var jumpSound = document.getElementById("jumpSound");
    var themeMusic = document.getElementById("theme");
    
    
    var splashScreen = document.getElementById("splashScreen"); 
    var rightBtn = document.getElementById("rightBtn");
    var leftBtn = document.getElementById("leftBtn");
    var upBtn = document.getElementById("upBtn");

    

    //_______Sprites_________
   // 

    var spritesheet = new Image();
    spritesheet.src = "asset/sprites/spritesheet_city.png";
    
    var playerSprite = 61,
        monsterSprite = 110,
        treasureSprite = 145,
        emptyTreasureSprite = 144,
        heartSprite = 26,
        halfHeartSprite = 27,
        emptyHeartSprite = 28;

    
    //_______Other_________
   // 
    var currentMap;
    var currentLevel = 1;
    var playerLives = 6;
    var MAX_LIVES = 6;
    
    var playerColBuff = 0;
    
    var showFPS = true;
    var playSound = false;
    
    var t2p      = function(t)     { return t*TILE;                     },
        p2t      = function(p)     { return Math.floor(p/TILE);         },
        
        cell     = function(x,y)   { return tcell(p2t(x),p2t(y));       },
        tcell    = function(tx,ty) { return cTiles[tx + (ty*MAP.tw)];   }, //return array index of tile at t coord
        
        nccell   = function(x,y)   { return nctcell(p2t(x),p2t(y));     },
        nctcell  = function(tx,ty) { return ncTiles[tx + (ty*MAP.tw)];  },
    
        bcell   = function(x,y)   { return btcell(p2t(x),p2t(y));       },
        btcell  = function(tx,ty) { return bTiles[tx + (ty*MAP.tw)];    };

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

    function updatePlayer(dt) {
        // check goal and collected treasure
        if (overlap(player.x, player.y, TILE, TILE, currentMap.properties.goalTx * TILE, currentMap.properties.goalTy * TILE, TILE, TILE) 
            && player.collected >= treasure.length) {
            console.log("GOAL REACHED!");
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
        playerLives--;
        player.x = player.start.x;
        player.y = player.start.y;
        player.dx = player.dy = 0;
        
        if (playerLives <= 0){
            //send back to level 1
        }
    }
    
    function playerOverlap(x, y, width, height){
        return overlap(player.x + playerColBuff , player.y + playerColBuff, TILE - playerColBuff * 2, TILE - playerColBuff* 2, x, y, width, height);
    }
    
    function collectTreasure(t) {
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
            nx        = entity.x%TILE,          //depth of player into tile 
            ny        = entity.y%TILE,
            cell      = tcell(tx,     ty),      //index of tile containing player
            cellright = tcell(tx + 1, ty),      //index of tile right of player
	    cellleft  = tcell(tx - 1, ty),
            celldown  = tcell(tx,     ty + 1),  //index of tile below player
            celldiag  = tcell(tx + 1, ty + 1);  //index of tile down and right of player
	    celldiagL = tcell(tx - 1, ty + 1);
	           
        
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

	if (!falling && (celldiag) && !celldown && (nx < TILE * 7.0/32.0) && !cellright) { // butter
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
  
    function render(ctx, frame, dt) {
        ctx.clearRect(0, 0, width, height);
        renderMap(ctx);
        renderTreasure(ctx, frame);
        renderPlayer(ctx, dt);
        renderMonsters(ctx, dt);
    }

    function renderMap(ctx) {
        var x, y, cell;
        for(y = 0 ; y < MAP.th ; y++) {
            for(x = 0 ; x < MAP.tw ; x++) {
                cell = tcell(x, y);
                nccell = nctcell(x,y);
                bcell = btcell(x,y);
                if (bcell) {
                    console.log("trying to draw background sprite");
                    drawSprite(bcell - 1, x * TILE, y * TILE)
                }
                if (cell) {
                    drawSprite(cell - 1, x * TILE, y * TILE)
                }
                if (nccell) {
                    drawSprite(nccell - 1, x * TILE, y * TILE)
                }
                
            }
        }
        
    }
 
    function renderPlayer(ctx, dt) {
        drawSprite(playerSprite, player.x + (player.dx * dt), player.y + (player.dy * dt) );
        
        //ctx.fillRect(player.x +  playerColBuff, player.y + playerColBuff, TILE - playerColBuff * 2, TILE - playerColBuff * 2);

        renderScores();
    }
    
    function renderScores(){
        var n, max;
        var scale = .75;
        
        // Draw collected treasure
        for(n = 0, max = player.collected ; n < treasure.length ; n++){
            if(n < max)
                drawSpriteScaled(treasureSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 2), TILE * scale, TILE * scale);
            else
                drawSpriteScaled(emptyTreasureSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 2), TILE * scale, TILE * scale);
        }
        // Draw slain monsters
        for(n = 0, max = player.killed ; n < max ; n++)
            drawSpriteScaled(monsterSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 1), TILE * scale, TILE * scale); 
        
        //Draw lives
        for(n = 0; n < Math.floor(MAX_LIVES / 2) ; n++){
            drawSpriteScaled(emptyHeartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale);
        }
        for(n = 0; n < Math.floor(playerLives / 2) ; n++){
            drawSpriteScaled(heartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale);
        }
        if (playerLives % 2 != 0)
            drawSpriteScaled(halfHeartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale);
        
        
        
    }

    function renderMonsters(ctx, dt) {
        var n, max, monster;
        for(n = 0, max = monsters.length ; n < max ; n++) {
            monster = monsters[n];
            if (!monster.dead){
                drawSprite(monsterSprite, monster.x + (monster.dx * dt), monster.y + (monster.dy * dt));
            }
        }
    }

    function renderTreasure(ctx, frame) {
        ctx.globalAlpha = 0.25 + tweenTreasure(frame, 60);
        var n, max, t;
        for(n = 0, max = treasure.length ; n < max ; n++) {
            t = treasure[n];
            if (!t.collected)
                drawSprite(treasureSprite, t.x, t.y );
        }
        ctx.globalAlpha = 1;
    }

    function tweenTreasure(frame, duration) {
        var half  = duration/2
        pulse = frame % duration;
        return pulse < half ? (pulse/half) : 1-(pulse-half)/half;
    }
    
    function drawSprite(tileNum, x , y){
        var sx = t2p(tileNum % (spritesheet.width / TILE));
        var sy = t2p(Math.floor(tileNum / (spritesheet.width / TILE)));
        ctx.drawImage(spritesheet, sx, sy, TILE, TILE, x, y, TILE, TILE);
    }
    
    function drawSpriteScaled(tileNum, x , y, width, height){
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
		}
		element.style.opacity = opacity;
		element.style.filter = 'alpha(opacity ='+opacity*100+")";
           opacity-= opacity* 0.1;
		}, 50);
    }

    function setup(map) {
        console.log("setting up map " + currentLevel);
        var objects, n, obj, entity;
        
        currentMap = map;
        console.log(map.width + "    " + map.height);
        MAP.tw = map.width;
        MAP.th = map.height;
        TILE = map.tileheight;
        
        for(var i = 0; i < map.layers.length; i++){
            var layer = map.layers[i];
            switch (layer.name){
                case "cTiles" :
                    cTiles = layer.data; break;
                case "ncTiles" :
                    ncTiles = layer.data; break;
                case "objects" :
                    objects = layer.objects; break;
                case "background" :
                    bTiles = layer.data; break;
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
        entity.killed = entity.collected = 0;
        console.log("loaded entity");
        return entity;
    }
    
    function nextLevel(){
        player.x = 1000; // prevent multiple goal reached
        player.y = 1000;
        monsters = [],
        treasure = [],
        cTiles   = [],
        ncTiles  = [],
        bTiles   = [];
        
        currentLevel++;
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
        if (playSound) themeMusic.play();
        fpsmeter.tickStart();
        now = timestamp();
        dt = dt + Math.min(1, (now - last) / 1000);
        while(dt > step) {
            dt = dt - step;
            update(step);
        }

        render(ctx, counter, dt);
        last = now;
        counter++;
        fpsmeter.tick();
        requestAnimationFrame(frame, canvas);
    }

    function touchHandler(e) {
        e.preventDefault();
        var type = e.type;
        var id = e.target.id;
        //console.log("touchevent! - " + id + "      " + type);
        switch (id){
            case 'rightBtn':
                if(type == 'touchstart') onkey(e, KEY.RIGHT, true);
                else if(type == 'touchend') onkey(e, KEY.RIGHT, false);	
                break;
            case 'leftBtn':
                if(type == 'touchstart') onkey(e, KEY.LEFT, true);
                else if(type == 'touchend') onkey(e, KEY.LEFT, false);	
                break;
            case 'upBtn':
                //console.log("up done");
                if(type == 'touchstart') onkey(e, KEY.SPACE, true);
                else if(type == 'touchend') onkey(e, KEY.SPACE, false);	
                break;
	    case 'splashScreen':
		
		if(type == 'touchstart') 
		{}
		else if (type == 'touchend'){
 			fadeOut(splashScreen);
			
	        }
			rightBtn.style.visibility = "visible";
			leftBtn.style.visibility = "visible";
			upBtn.style.visibility = "visible";
		break;
            default:
                break;
        }
    }

    document.addEventListener('keydown', function(ev) { return onkey(ev, ev.keyCode, true);  }, false);
    document.addEventListener('keyup',   function(ev) { return onkey(ev, ev.keyCode, false); }, false);

    document.getElementById("rightBtn").addEventListener('touchstart', touchHandler, false);
    document.getElementById("rightBtn").addEventListener('touchend', touchHandler, false);

    document.getElementById("leftBtn").addEventListener('touchstart', touchHandler, false);
    document.getElementById("leftBtn").addEventListener('touchend', touchHandler, false);

    document.getElementById("upBtn").addEventListener('touchstart', touchHandler, false);
    document.getElementById("upBtn").addEventListener('touchend', touchHandler, false);
  
    splashScreen.addEventListener('touchStart', touchHandler, false);
    splashScreen.addEventListener('touchend', touchHandler, false);

    get("asset/levels/level" + currentLevel + ".json", function(req) {
        setup(JSON.parse(req.responseText));
        frame();
    });

    //-------------------------------------------------------------------------
    // UTILITIES
    //-------------------------------------------------------------------------

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

})();
