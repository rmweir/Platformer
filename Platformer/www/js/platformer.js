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
        canvas_ui   = document.getElementById('game_ui'),
        ctx_static  = canvas_static.getContext('2d'),
        ctx_dynamic = canvas_dynamic.getContext('2d'),
        ctx_ui      = canvas_ui.getContext('2d'),
        width    = canvas_static.width  = canvas_dynamic.width  = MAP.tw * TILE,
        height   = canvas_static.height  = canvas_dynamic.height = MAP.th * TILE,
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


    //_______Sprites_________
   // 

    var spritesheet = new Image();
    spritesheet.src = "asset/sprites/spritesheet_combined.png";
    
    var playerSprite = 1141,
        monsterSprite = 110,
        treasureSprite = 1128,
        emptyTreasureSprite = 144,
        heartSprite = 26,
        halfHeartSprite = 27,
        emptyHeartSprite = 28;
    
    //_______UI Elements_________
    
    var w = canvas_ui.width = window.innerWidth;
    var h = canvas_ui.height = window.innerHeight;
    
    console.log("w: " + w + "  h: " + h );
   
    function uiElement(name, x, y, width, height){ //maybe add onpress function, name
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.sprite = new Image();
    }
    uiElement.prototype.contains = function(x,  y){
        return ( x >= this.x && y >= this.y && x <= (this.x + this.width) && y <= (this.y + this.height) );
    };
    
    var upBtn = new uiElement("up", w - w/10, h - w/10, w/10, w/10);
    (upBtn.sprite).src = "asset/sprites/up.png";
    
    var leftBtn = new uiElement("left", 0, h - w/10, w/10, w/10);
    (leftBtn.sprite).src = "asset/sprites/left.png";
    
    var rightBtn = new uiElement("right", w/10 + w/20, h - w/10, w/10, w/10);
    (rightBtn.sprite).src = "asset/sprites/right.png";
    
    
    
    
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
        renderPlayer(ctx_dynamic, dt);
        renderMonsters(ctx_dynamic, dt);
        
    }

    function renderMap(ctx) {
        console.log("RENDERING MAP");
        var x, y, cell;
        for(y = 0 ; y < MAP.th ; y++) {
            for(x = 0 ; x < MAP.tw ; x++) {
                cell = tcell(x, y);
                nccell = nctcell(x,y);
                bcell = btcell(x,y);
                if (bcell) {
                    drawSprite(bcell - 1, x * TILE, y * TILE, ctx)
                }
                if (cell) {
                    drawSprite(cell - 1, x * TILE, y * TILE, ctx)
                }
                if (nccell) {
                    drawSprite(nccell - 1, x * TILE, y * TILE, ctx)
                }
                
            }
        } 
    }
    
    function renderUi() {
        ctx_ui.setLineDash([6]);
        
        ctx_ui.drawImage(upBtn.sprite, upBtn.x, upBtn.y, upBtn.width, upBtn.height);
        ctx_ui.strokeRect(upBtn.x, upBtn.y, upBtn.width, upBtn.height);
        
        ctx_ui.drawImage(leftBtn.sprite, leftBtn.x, leftBtn.y, leftBtn.width, leftBtn.height);
        ctx_ui.strokeRect(leftBtn.x, leftBtn.y, leftBtn.width, leftBtn.height);
        
        ctx_ui.drawImage(rightBtn.sprite, rightBtn.x, rightBtn.y, rightBtn.width, rightBtn.height);
        ctx_ui.strokeRect(rightBtn.x, rightBtn.y, rightBtn.width, rightBtn.height);
    }
 
    function renderPlayer(ctx, dt) {
        drawSprite(playerSprite, player.x + (player.dx * dt), player.y + (player.dy * dt), ctx);
        
        //ctx.fillRect(player.x +  playerColBuff, player.y + playerColBuff, TILE - playerColBuff * 2, TILE - playerColBuff * 2);

        renderScores(ctx);
    }
    
    function renderScores(ctx){
        var n, max;
        var scale = .75;
        
        // Draw collected treasure
        for(n = 0, max = player.collected ; n < treasure.length ; n++){
            if(n < max)
                drawSpriteScaled(treasureSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 2), TILE * scale, TILE * scale, ctx);
            else
                drawSpriteScaled(emptyTreasureSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 2), TILE * scale, TILE * scale, ctx);
        }
        // Draw slain monsters
        for(n = 0, max = player.killed ; n < max ; n++)
            drawSpriteScaled(monsterSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 1), TILE * scale, TILE * scale, ctx); 
        
        //Draw lives
        for(n = 0; n < Math.floor(MAX_LIVES / 2) ; n++){
            drawSpriteScaled(emptyHeartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale, ctx);
        }
        for(n = 0; n < Math.floor(playerLives / 2) ; n++){
            drawSpriteScaled(heartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale, ctx);
        }
        if (playerLives % 2 != 0)
            drawSpriteScaled(halfHeartSprite, (TILE * 5) + n * TILE * scale, t2p(MAP.th - 3), TILE * scale, TILE * scale, ctx);
        
        
        
    }

    function renderMonsters(ctx, dt) {
        var n, max, monster;
        for(n = 0, max = monsters.length ; n < max ; n++) {
            monster = monsters[n];
            if (!monster.dead){
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
        pulse = frame % duration;
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
		}
		element.style.opacity = opacity;
		element.style.filter = 'alpha(opacity ='+opacity*100+")";
           opacity-= opacity* 0.1;
		}, 50);
        element.style.zIndex = 0;
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
        ctx_static.clearRect(0, 0, width, height);
        renderMap(ctx_static);
        renderUi();
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
        fpsmeter.tickStart();
        now = timestamp();
        dt = dt + Math.min(1, (now - last) / 1000);
        while(dt > step) {
            dt = dt - step;
            update(step);
        }

        render(counter, dt);
        last = now;
        counter++;
        fpsmeter.tick();
        requestAnimationFrame(frame);
    }
    
    var upID, leftID, rightID;

    function touchHandler(e) {
        e.preventDefault();
        var type = e.type;
    
        if(type == 'touchstart') {
            for (i = 0; i < (e.touches).length; i++) {
                var touch = e.touches[i];
                var x = touch.pageX;
                var y = touch.pageY;
                checkButtons(x, y, touch);
            }
        }
        else if (type == 'touchend') {
            player.jump = false;
            player.right = false;
            player.left = false;
            var i;
            for (i = 0; i < (e.touches).length; i++) {
                var touch = e.touches[i];
                var touchID = touch.identifier;
                switch (touchID){
                    case rightID:
                        player.right = true;
                        break;
                    case leftID:
                        player.left = true;
                        break;
                    case upID:
                        player.jump = true;	
                        break;
                    default:
                        console.log("ID gone");
                        break;
                }
            }
        }
        
    }
    
    function splashScreenTouch(e){
        e.preventDefault();
        fadeOut(splashScreen);
    }
    
    function checkButtons(x, y, touch){
        if(upBtn.contains(x,y)){
            console.log("UP");
            player.jump = true;
            upID = touch.identifier;
        }
        else if(leftBtn.contains(x,y)){
            console.log("LEFT");
            player.left = true;
            leftID = touch.identifier;
        }
        else if(rightBtn.contains(x,y)){
            console.log("RIGHT");
            player.right = true;
            rightID = touch.identifier;
        }
    }
    
    function addListeners() {
        document.addEventListener('keydown', function(ev) { return onkey(ev, ev.keyCode, true);  }, false);
        document.addEventListener('keyup',   function(ev) { return onkey(ev, ev.keyCode, false); }, false);

        document.addEventListener('touchstart', touchHandler, false);
        document.addEventListener('touchend', touchHandler, false);
        
        splashScreen.addEventListener('touchstart', splashScreenTouch, false);
        splashScreen.addEventListener('touchend', splashScreenTouch, false);
        
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
        if (playSound) themeMusic.play();
        
        addListeners();
        //fadeOut(splashScreen);
        
        get("asset/levels/level" + currentLevel + ".json", function(req) {
            setup(JSON.parse(req.responseText));
            frame();
        });
    }
    
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
    
    startGame();

})();
