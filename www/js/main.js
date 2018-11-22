/**
 * Simple implementation of a Tetris game
 */
let game = null;

/** 
 * Called when window finished its loading
 * @param {Event} event onload event description
 */
window.onload = function (event) {
  game = new TetrisView();
};

class TetrisView {
   constructor() {
      // Timing management -----------------------------------------------------
      this.timeMsPrev  = NaN;          // Time stamp on previous update
      this.timeMsDelta = 0;            // Ellapsed time since last update
      this.timeMsLevel = 0;            // Timer used to limit level duration
      this.timeMsAnim  = 0;            // Timer used to manage animations
      this.timeMsMove  = 0;            // Timer used to limit move speed
      this.timeMsFall  = 0;            // Timer used to limit fall speed

      /** @type {Timing} Manages game timing and statistics */
      this.viewTimer = new Timing(['animation']);

      /** @type {Tetris} Game logic */
      this.model = new Tetris(this);

      /** @type {STATES} Game state */
      this.state = TetrisView.STATES.title;

      /** @type {Number} Size of a block expressed in pixel */
      this.size = 32;

      /** @type {Canvas} The canvas for the game field */
      this.cnvGame = document.getElementById("game");
      this.cnvGame.width  = 384;
      this.cnvGame.height = 704;

      /** @type {Contex2D} Drawing context for the game */
      this.ctxGame = this.cnvGame.getContext("2d");

      /** @type {Canvas} The canvas for the next shape */
      this.cnvNext = document.getElementById("next");
      this.cnvNext.width  = 160;
      this.cnvNext.height = 96;

      /** @type {Contex2D} Drawing context for the next shape */
      this.ctxNext = this.cnvNext.getContext("2d");

      /** @type {Object} Stores the current keyboard status */
      this.keys = {};

      // Attach keyboard events
      document.addEventListener("keydown", (ev) => this.keyUpDownEvent(ev));
      document.addEventListener("keyup",   (ev) => this.keyUpDownEvent(ev));

      // Start game update
      this.update();
   }
  
   /**
    * Store the state of the pressed / released keys
    * @param {KeyEvent} event Key event data
    */
   keyUpDownEvent(event) {
      let pressed  = (event.type == "keydown");
      let keyState = this.keys[event.code];

      if (keyState === undefined) {
         keyState = { last: false, pressed: false };
         this.keys[event.code] = keyState;
      }

      // Process event only on transition because keydown is repeated by browser
      if (keyState.last !== pressed) {
         keyState.last    = pressed;
         keyState.pressed = pressed;

         // TODO: beurk à changer
         // Supported actions
         if (event.code == TetrisView.KEYBOARD.left)   this.model.askLeft   = pressed;
         if (event.code == TetrisView.KEYBOARD.right)  this.model.askRight  = pressed;
         if (event.code == TetrisView.KEYBOARD.drop)   this.model.askDrop   = pressed;
         if (event.code == TetrisView.KEYBOARD.rotate) this.model.askRotate = pressed;
      }
   }

   /**
    * Return the current key status
    * @returns {Boolean} true when key is pressed, otherwise false
    */
   isKeyPressed(keyName) {
      return (this.keys[keyName] !== undefined && this.keys[keyName].pressed);
   }

   /**
    * Set the given key to released (not pressed)
    * @param {String} keyName Name of the key to clear (set to released)
    */
   clearKey(keyName) {
      if (this.keys[keyName] !== undefined) {
         this.keys[keyName].pressed = false;
      }
   }
  
   /**
    * Function called periodically which is synchronized with the screen refresh
    */
   update() {
      // request next frame update
      requestAnimationFrame( () => this.update() );

      // Manages all timer and time statistics
      this.viewTimer.update();

      // Display performance statistics
      //document.getElementById("debug").innerHTML = (1000 / this.viewTimer.fps).toFixed(1);
      document.getElementById("debug").innerHTML = this.model.debug;

      // Manages the display for the active state
      switch (this.state) {
         case TetrisView.STATES.play:  this.statePlay();  break;
         case TetrisView.STATES.pause: this.statePause(); break;
         case TetrisView.STATES.over:  this.stateOver();  break;
         default:                      this.stateTitle(); break;
      }
   }
  
   /** Display the title page */
   stateTitle() {
      // Start game when action key is pressed
      if (this.isKeyPressed(TetrisView.KEYBOARD.action)) {
         this.clearKey(TetrisView.KEYBOARD.action);
         this.state = TetrisView.STATES.play;
         this.model.newGame();
         return;
      }
  
      // Game not started, display the title page
      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
  
      if (this.viewTimer.getTimer('animation') > 1000) {
         this.viewTimer.clrTimer('animation');
      }
      else if (this.viewTimer.getTimer('animation') < 500) {
         this.writeCenterText(
         this.ctxGame,
            "Press ENTER to start",
            (this.cnvGame.width  / 2) || 0,
            (this.cnvGame.height / 2) || 0,
            24,
            "#ffaabb",
            "gamefont"
         );      
      }
   }
  
   /** Game configugration screen */
   stateConfigure() {
      // TODO
   }

   /** Display game while playing */
   statePlay() {
      // Enter pause ?
      if (this.isKeyPressed(TetrisView.KEYBOARD.action)) {
        this.clearKey(TetrisView.KEYBOARD.action);
        this.state = TetrisView.STATES.pause;
        this.model.waiting = true;
      }

      this.model.update();

      // Manage delay for line deletion animation
      if (this.model.waiting) {
         if (this.viewTimer.getTimer('animation') > 100) {
            this.model.waiting = false;
         }
         else {
            // TODO Show animation
            return;
         }
      }
  
      // Detect end of game from the model state
      if (this.model.playing == false) {
        this.state = TetrisView.STATES.over;
        this.viewTimer.clrTimer('animation');
        return;
      }
  
      // TODO: Update screen only when something changed in the game
      if (true) {
         this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
         this.drawField();
         this.drawShape(this.ctxGame, this.model.pieceGhost, 0, 0, ' ');

         let percentY = this.model.modelTimer.getTimer('dropSpeed') / this.model.getLevel().dropSpd;
         let percentX = this.model.modelTimer.getTimer('moveSpeed') / this.model.getLevel().moveSpd;

         this.drawShape(this.ctxGame, this.model.pieceCurr,
            this.model.moving  * this.size * percentX,
            this.model.falling * this.size * percentY
         );


         this.ctxNext.clearRect(0, 0, this.cnvNext.width, this.cnvNext.height);
         this.displayData();
      }
   }

   /** Shows the line deletion animation */
   stateLineDelete() {
   }

   /** Shows a pause screen when a level is completed */
   stateEndOfLevel() {
   }

   /** Shows the pause screen */
   statePause() {
      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);

      if (this.isKeyPressed(TetrisView.KEYBOARD.action)) {
         this.clearKey(TetrisView.KEYBOARD.action);
         this.state = TetrisView.STATES.play;
         this.model.newGame();
      }

      if (this.viewTimer.getTimer('animation') > 1000) {
         this.viewTimer.clrTimer('animation');
      }
      else if (this.viewTimer.getTimer('animation') < 500) {
         this.writeCenterText(
            this.ctxGame,
            "Press ENTER to resume",
            (this.cnvGame.width  / 2) || 0,
            (this.cnvGame.height / 2) || 0,
            24,
            "#ffaabb",
            "gamefont"
         );      
      }
   }
  
   /** Show the game over screen */
   stateOver() {
      // Show gameover for 2 seconds
      if (this.viewTimer.getTimer('animation') > 2000) {
         this.state = TetrisView.STATES.title;
         return;
      }

      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
      this.writeCenterText(
         this.ctxGame,
         "Game is over",
         (this.cnvGame.width / 2) || 0,
         (this.cnvGame.height / 2) || 0,
         24,
         "#ffaabb",
         "gamefont"
      );
   }

   /** Draw one block (a square) at the given position */ 
   drawBlock(ctx, color, x, y) {
      let w2 = 1;
      ctx.save();

      // Draw the filled square
      ctx.fillStyle = color;
      ctx.fillRect(x, y, this.size, this.size);

      // Draw square border
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2 * w2;
      ctx.moveTo(x + w2, y+w2);
      ctx.lineTo(x - w2 + this.size, y + w2);
      ctx.lineTo(x - w2 + this.size, y - w2 + this.size);
      ctx.stroke();
      ctx.closePath();

      // Draw square border
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2 * w2;
      ctx.moveTo(x + w2, y + w2);
      ctx.lineTo(x + w2,             y - w2 + this.size);
      ctx.lineTo(x - w2 + this.size, y - w2 + this.size);
      ctx.stroke();
      ctx.closePath();

      ctx.restore();
   }

   imgBlock(ctx, id, x, y) {
      let img = document.getElementById("square" + id);
      if (img) {
         ctx.drawImage(img,x, y, this.size, this.size);
      }
      else {
         this.drawBlock(ctx, "rgba(255, 255, 255, 0.1)", x, y);
      }
   }

   /** Show the line deletion animation */
   deleteLines(lines) {
      this.model.waiting = true;
      this.viewTimer.clrTimer('animation');
      for(let i=0; i<lines.length; i++) {
         for (let x = 0; x < this.model.board.width; x++) {
            this.drawBlock(this.ctxGame, "#000", this.size * x, this.size * lines[i]);
         }
      }
   }

  
   /** Draw the entire play field (not the moveing shape) */
   drawField() {
      for (let y = 0; y < this.model.board.height; y++) {
         for (let x = 0; x < this.model.board.width; x++) {
               let id = this.model.board.getCell(x, y);
               if (id != this.model.board.EMPTY) {
                  this.imgBlock(
                     this.ctxGame,
                     id,
                     x * this.size,
                     y * this.size);
               }
         }
      }
   }

   /**
   * Draw the shape in the given canvas
   */
   drawShape(ctx, shape, offx, offy, id) {
      let that  = this;
      id = id || shape.id;

      // Set default value for optional parameters
      offx = offx || 0;
      offy = offy || 0;

      // Draw the blocks
      shape.foreach(function(x, y) {
         that.imgBlock(
            ctx,
            id,
            x * that.size + offx,
            y * that.size + offy
         );
      });
   }   

   /**
    * Center a text at a given point
    *
    * @param {Context} aCtx    - Context to draw in
    * @param {string}  aTxt    - The text
    * @param {number}  aX, aY  - Center position
    * @param {number}  aHeight - Font height in pixel
    * @param {string}  aColor  - Text color
    * @param {string}  aFont   - Font name
    */
   writeCenterText(aCtx, aTxt, aX, aY, aHeight, aColor, aFont) {
      var width;

      aCtx.save();
      aCtx.fillStyle = aColor || "#fff";

      // Set the size and font
      if (aHeight !== undefined) {
         if (aFont !== undefined) {
            aCtx.font = aHeight + "px " + aFont;
         }
         aHeight = Math.floor(aHeight * 2 / 3);
      }
      else {
         // TODO: extract from font string -> slow
         aHeight = 0;
      }

      // Compute string width
      width = (aCtx.measureText(aTxt)).width;

      // Draw the string
      aCtx.fillText(aTxt, Math.floor(aX - width / 2), Math.floor(aY - aHeight));

      // Restore
      aCtx.restore();
   }
  
   /** Display the game data */
   displayData() {
      document.getElementById("score").innerText = this.model.score;
      document.getElementById("lines").innerText = this.model.line;
      document.getElementById("level").innerText = this.model.level;  
      document.getElementById("timer").innerText = (this.model.countdown / 1000).toFixed(1);

      // Compute the center point of the shape
      let maxX = -10, minX = 10, maxY = -10, minY = 10;
      this.model.pieceNext.foreach( function(x, y) {
         if ((x <= minX)) minX = x;
         if ((x >= maxX)) maxX = x;
         if ((y <= minY)) minY = y;
         if ((y >= maxY)) maxY = y;
      });

      let cx = Math.round((this.cnvNext.width  - (maxX + minX + 1) * this.size) / 2);
      let cy = Math.round((this.cnvNext.height - (maxY + minY + 1) * this.size) / 2);

      this.drawShape(
         this.ctxNext,
         this.model.pieceNext,
         cx,
         cy
      );
   }

   /** Convert tetromino ID to color, possible ID "OTZSILJ" */
   idToColor(id) {
      switch (id) {
        case 'O': return "#ff0";
        case 'T': return "#f0f";
        case 'Z': return "#f00";
        case 'S': return "#0f0";
        case 'I': return "#0ff";
        case 'L': return "#880";
        case 'J': return "#00f";
      }
      return "#000";
   }

   /** The game view states */
   static get STATES() {
      return {
         title:1,
         play :2,
         pause:3,
         over :4
      };
   }
    
   /** The keyboard bindings action -> keyCode */
   static get KEYBOARD() {
      return {
         left:   "ArrowLeft",
         right:  "ArrowRight",
         drop:   "ArrowDown",
         rotate: "ArrowUp",
         action: "Enter"
      };
   }
}

//------------------------------------------------------------------------------
// GAME LOGIC
class Tetris {
   /**
    * Create a new instance of the game logic
    * @param {TetrisView} view 
    */
   constructor(view) {
      /** @type {Timing} Manages game timing and statistics */
      this.modelTimer = new Timing(['dropSpeed', 'moveSpeed', 'levelTime']);

      /** @type {TetrisView} Reference to the view */
      this.view = view || null;
  
      /** @type {Number} Game field width expressed as squares  */
      //this.width = 12;
  
      /** @type {Number} Game field height expressed as squares */
      //this.height = 22;
  
      /** @type {Field} The game field */
      this.board = new Board(12, 22);
  
      /** @type {Shape} The shape that is currently falling */
      this.pieceCurr = null;

      /** @type {Shape} The next shape in the game */
      this.pieceNext = null;

      /** @type {Shape} The next shape in the game */
      this.pieceGhost = null;

      /**
       * @type {Number} Is the shape falling 1:yes, 0 no.
       * This field is usefull for the pixel precise falling animation
       */
      this.falling = 1;
      this.moving  = 0;

      /** @type {Number} Game level */
      this.level = 1;
  
      /** @type {Number} Counts the completed lines */
      this.line = 0;
  
      /** @type {Number} Game score */
      this.score = 0;
  
      /** @type {Number} Kind of game (normal or sprint) */
      this.gameMode = Tetris.GAME_MODES.normal;
  
      /** @type {Boolean} Is the game playing */
      this.playing = false;
  
      /** @type {Boolean} Is the game waiting for animation's end */
      this.waiting = false;

      /** Asked to move left */
      this.askLeft = false;

      /** Asked to move right */
      this.askRight = false;

      /** Asked to rotate */
      this.askRotate = false;

      /** Asked drop the piece */
      this.askDrop = false;
   }
  
   /**
    * Initialise the model to start a new game
    */
   newGame() {
      this.board.generateEmpty();
      this.pieceCurr   = new Shape({x: this.board.width / 2 - 2});
      this.pieceNext   = new Shape({x: this.board.width / 2 - 2});
      this.pieceGhost = new Shape(this.pieceCurr);
      this.level = 1;
      this.line = 0;
      this.score = 0;
      this.playing = true;

      if (this.gameMode === Tetris.GAME_MODES.sprint) {
         this.modelTimer.clrTimer('levelTime');
         this.board.insertLines(5);
      }
      this.modelTimer.refresh();
      this.modelTimer.clrTimer('dropSpeed');
   }
  
   /**
    * Timer callback which is responsible to compute next game step
    */
   update() {


      // Exit if not in game or waiting for view animation
      if (!this.playing || this.waiting) {
         this.modelTimer.refresh();
         return;
      }

      // Manage game time variables
      this.modelTimer.update();
      if (this.gameMode === Tetris.GAME_MODES.sprint) {
         if (this.modelTimer.getTimer('levelTime') >= this.getLevel().maxTime) {
            this.playing = false;
         }
      }

      let temp = new Shape(this.pieceCurr);
      this.falling = temp.move(this.board, 0, +1) ? 1 : 0;

      if (this.modelTimer.getTimer('moveSpeed') >= this.getLevel().moveSpd) {
         this.modelTimer.clrTimer('moveSpeed');
         this.moving = 0;

         let firstMove = this.modelTimer.getTimer('dropSpeed') < 2 * this.getLevel().moveSpd;

         // Try to move the shape as requested by the player
         if (this.askLeft && (firstMove || temp.move(this.board,-1,0))) {
            if (this.pieceCurr.move(this.board, -1, 0)) {
               //this.moving = -1;
            }
         }
   
         if (this.askRight && (firstMove || temp.move(this.board,1,0))) {
            if (this.pieceCurr.move(this.board, +1, 0)) {
               //this.moving = +1;
            }
         }
   
         if (this.askRotate) {
            this.pieceCurr.rotate(this.board, 1);
            this.askRotate = false;
         }

         // Compute the ghost piece
         this.pieceGhost.x = this.pieceCurr.x;
         this.pieceGhost.y = this.pieceCurr.y;
         this.pieceGhost.orientation = this.pieceCurr.orientation;
         while(this.pieceGhost.move(this.board, 0, 1)) {
            // nothing to do
         }
      }

      if (this.askDrop || this.modelTimer.getTimer('dropSpeed') >= this.getLevel().dropSpd) {
         this.modelTimer.clrTimer('dropSpeed');

         // Move the shape down and exit if the move was possible
         if (!this.pieceCurr.move(this.board, 0, +1)) {
            // Stop key repetition for the next piece
            this.askDrop = false;

            // Write the shape in the game field
            this.pieceCurr.write(this.board);

            this.debug = this.pieceCurr.y;

            // Delete completed lines
            let lines = this.board.searchFullLines();
            if (lines.length > 0) {
               this.view.deleteLines(lines);
               this.board.deleteLines(lines);
               this.computeScore(lines);
            }

            // Game is over when the shape is still at the top of the play field
            if (this.pieceCurr.y == 0) {
               this.playing = false;
            }

            //generate a new piece
            this.pieceCurr  = this.pieceNext;
            this.pieceGhost = new Shape(this.pieceCurr);
            this.pieceNext  = new Shape({x: this.board.width / 2 - 2});
         }
      }
   }
  
   /**
    * Compute the score when a piece is fixed
    * @param {Array} lines array of deleted lines
    */
   computeScore(lines) {
      if (this.gameMode == Tetris.GAME_MODES.normal) {
         this.score += 1;                    // Score for a new piece
         this.score += lines.length * 100;   // Score for completed lines
         this.line  += lines.length;

         if (this.line >= this.getLevel().nbLine) {
            this.level += 1;
         }
      }
      else {
         this.score += 1;                    // Score for a new piece
         this.score += lines.length * 100;   // Score for completed lines
         this.line  += lines.length;

         if (this.line >= 5) {
            this.level += 1;
            // TODO : view has to block until level starts
            this.board.insertLines(10);
         }
      }


   }

   /** Returns the current level definition */
   getLevel() {
      let levelData;
      if (this.gameMode === Tetris.GAME_MODES.normal) {
         levelData = [
            {nbLine:   5, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 500, moveSpd: 100}, // not used
            {nbLine:   5, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 500, moveSpd: 100}, // 1
            {nbLine:  10, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 450, moveSpd: 100}, // 2
            {nbLine:  15, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 400, moveSpd: 100}, // 3
            {nbLine:  20, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 350, moveSpd: 100}, // 4
            {nbLine:  25, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 300, moveSpd: 100}, // 5
            {nbLine:  30, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 250, moveSpd: 100}, // 6
            {nbLine:  35, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 200, moveSpd: 100}, // 7
            {nbLine:  40, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 150, moveSpd: 100}, // 8
            {nbLine:  45, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 100, moveSpd: 100}, // 9
            {nbLine: 999, maxTime: Number.MAX_SAFE_INTEGER, dropSpd:  50, moveSpd: 100}  // 10
         ];
      }
      else if (this.gameMode === Tetris.GAME_MODES.sprint) {
         levelData = [
            {nbLine:   5, maxTime: 30000, dropSpd: 500, moveSpd: 100},  // index 0 is not used
            {nbLine:   5, maxTime: 30000, dropSpd: 500, moveSpd: 100},
            {nbLine:  10, maxTime: 30000, dropSpd: 450, moveSpd: 100},
            {nbLine:  15, maxTime: 30000, dropSpd: 400, moveSpd: 100},
            {nbLine:  20, maxTime: 30000, dropSpd: 350, moveSpd: 100},
            {nbLine:  25, maxTime: 30000, dropSpd: 300, moveSpd: 100},
            {nbLine:  30, maxTime: 30000, dropSpd: 250, moveSpd: 100},
            {nbLine:  35, maxTime: 30000, dropSpd: 200, moveSpd: 100},
            {nbLine:  40, maxTime: 30000, dropSpd: 150, moveSpd: 100},
            {nbLine:  45, maxTime: 30000, dropSpd: 100, moveSpd: 100},
            {nbLine: 999, maxTime: 30000, dropSpd:  50, moveSpd: 100}
         ];
      }
      return levelData[this.level];
   }

   static get GAME_MODES () {
      return {
         // In "normal" mode, the player has to play as long as it is possible.
         // The level increase after a given number of completed lines
         normal: 0,

         // In "sprint" mode, the game starts with prefilled lines, the level 
         // is cleared after completing a given amount of lines but the time
         // to reached this goal is limited.
         sprint: 1
      };
   }
}

//------------------------------------------------------------------------------
// FIELD DEFINITION
class Board {
   constructor(width, height) {
     this.EMPTY  = " ";              /** An empty cells */
     this.width  = width || 12;      /** Board width  */
     this.height = height || 22;     /** Board height */
     this._board = [];               /** Board is an array of strings */
   }
  
   /** Generate an empty game field */
   generateEmpty() {
      this._board = Array(this.height).fill(this.EMPTY.repeat(this.width));
   }

   /** Is the given position in the game board */
   isInside(x, y) {
      return !((x < 0) || (x >= this.width) || (y < 0) || (y >= this.height));
   }

   /** Is the given position in the game board or above */
   isInsideOrAbove(x, y) {
      return !((x < 0) || (x >= this.width) || (y >= this.height));
   }

   /** Reads the current cell values, returns empty when out of board */
   getCell(x, y) {
      return this.isInside(x, y) ? this._board[y][x] : this.EMPTY;
   }
  
   /** Writes the field's content at the given position */
   setCell(x, y, val) {
      if (this.isInside(x, y)) {
         this._board[y] = this._board[y].substring(0, x) +
                         val + this._board[y].substring(x + 1);
      }
   }
    
   /** Returns an array of the line that are completed (empty if none) */
   searchFullLines() {
     let result = [];
     for (let y = 0; y < this.height; y++) {
         if (this._board[y].indexOf(this.EMPTY,0) === -1) {
            result.push(y);        
         }
      }
     return result;
   }
  
   /** Delete board lines as defined in aList and insert new ones at top */
   deleteLines(aList) {
      for (let i = 0; i < aList.length; i++) {
         this._board.splice(aList[i], 1);                          // delete
         this._board.splice(0, 0, this.EMPTY.repeat(this.width));  // insert
      }
   }

   /** insert several prefilled lines at the bottom (shift the other up) */
   insertLines(nb) {
      while(nb > 0) {
         this._board.splice(0, 1);
         this._board.splice(this.height - 1, 0, this.randomLine());
         nb -= 1;
      }
   }

   /** Generate a random line filled, nbEmpty empty squares */
   randomLine(nbEmpty) {
      // Use default value if no param provided
      nbEmpty = nbEmpty || ((this.width / 3) | 0);
      let result = Array(this.width).fill(this.EMPTY);
      for(let count = this.width; count > nbEmpty; ) {
         let idx = Math.floor(Math.random() * this.width);
         if (result[idx] == this.EMPTY) {
            result[idx] = Shape.randomId;
            count -= 1;
         }

      }
      return result.join('');      
   } 
}

//------------------------------------------------------------------------------
// SHAPE DEFINITION
class Shape {
   /** Create a new random shape or based on provided data object */
   constructor(data) {
      // Use empty object when no data are provided
      data = data || {};

      /** @type {String} Shape ID can be one of OTZSILJ */
      this.id = data.id || Shape.randomId;

      /** @type {Number} Shape orientation */
      this.orientation = data.orientation || 0;

      /** @type {Number} Shape's horizontal position */
      this.x = data.x || 0;

      /** @type {Number} Shape's vertical position */
      this.y = data.y || 0;
   }
  
   /** Returns the squares for the current shape including orientation */
   get blocks() {
      //return DATA[this.id][this.orientation];
      return Shape.TETROMINOS[this.id][this.orientation];
   }
  
   /** Returns all orientations for the current shape */
   get shapes() {
      //return DATA[this.id];
      return Shape.TETROMINOS[this.id];
   }
  
   /** Do an action on each block of the shape */
   foreach(fct) {
      let action = (x, y) => fct(x, y);
      for (let i = 0; i < this.blocks.length; i++) {
         action(this.x + this.blocks[i].x,  this.y + this.blocks[i].y);
      }
   }
  
   /** Return true when shape position is possible, false otherwise */
   check(board) {
      let ok = true;
      this.foreach(function(x, y) {
         ok = ok && board.isInsideOrAbove(x,y) &&
                   (board.getCell(x,y) == board.EMPTY);
      });
      return ok;
   }
  
   /** Write the shape in the game board */
   write(board) {
      this.foreach( (x, y) => { board.setCell(x, y, this.id); } );
   }
  
   /** Moves the shape if possible */
   move(board, dx, dy) {
      this.x += dx;
      this.y += dy;

      if (!this.check(board)) {
         this.x -= dx;
         this.y -= dy;
         return false;
      }

      return true;
   }
  
   /** Rotates the shape if possible */
   rotate(board, dir) {
      let len = this.shapes.length;
      this.orientation = (this.orientation + dir + len) % len;

      if (!this.check(board)) {
         this.orientation = (this.orientation - dir + len) % len;
         return false;
      }

      return true;
   }
  
   /** Returns the shape definitions */
   static get TETROMINOS() {
      return {
         O: [  [{x:+0, y:+0},  {x:+1, y:+0},  {x:+0, y:+1},  {x:+1, y:+1}],
               [{x:+0, y:+0},  {x:+1, y:+0},  {x:+0, y:+1},  {x:+1, y:+1}],
               [{x:+0, y:+0},  {x:+1, y:+0},  {x:+0, y:+1},  {x:+1, y:+1}],
               [{x:+0, y:+0},  {x:+1, y:+0},  {x:+0, y:+1},  {x:+1, y:+1}]
            ],
         T: [  [{x:-1, y:+0},  {x:+0, y:+0},  {x:+1, y:+0},  {x:+0, y:+1}],
               [{x:+0, y:-1},  {x:+0, y:+0},  {x:+0, y:+1},  {x:-1, y:+0}],
               [{x:-1, y:+1},  {x:+0, y:+1},  {x:+1, y:+1},  {x:+0, y:+0}],
               [{x:+0, y:-1},  {x:+0, y:+0},  {x:+0, y:+1},  {x:+1, y:+0}]
            ],
         Z: [  [{x:+0, y:+0},  {x:+1, y:+0},  {x:-1, y:+1},  {x:+0, y:+1}],
               [{x:-1, y:-1},  {x:-1, y:+0},  {x:+0, y:+0},  {x:+0, y:+1}],
               [{x:+0, y:+0},  {x:+1, y:+0},  {x:-1, y:+1},  {x:+0, y:+1}],
               [{x:-1, y:-1},  {x:-1, y:+0},  {x:+0, y:+0},  {x:+0, y:+1}]
            ],
         S: [  [{x:-1, y: 0},  {x:+0, y:+0},  {x:+0, y:+1}, {x:+1, y:+1}],
               [{x: 0, y: 0},  {x:+0, y:+1},  {x:+1, y:+0}, {x:+1, y:-1}],
               [{x:-1, y: 0},  {x:+0, y:+0},  {x:+0, y:+1}, {x:+1, y:+1}],
               [{x: 0, y: 0},  {x:+0, y:+1},  {x:+1, y:+0}, {x:+1, y:-1}]
            ],
         I: [  [{x:-1, y:-1},  {x:+0, y:-1},  {x:+1, y:-1}, {x:+2, y:-1}],
               [{x: 1, y:-2},  {x:+1, y:-1},  {x:+1, y:+0}, {x:+1, y:+1}],
               [{x:-1, y:-1},  {x:+0, y:-1},  {x:+1, y:-1}, {x:+2, y:-1}],
               [{x: 1, y:-2},  {x:+1, y:-1},  {x:+1, y:+0}, {x:+1, y:+1}]
            ],
         L: [  [{x:-1, y: 0},  {x:+0, y:+0},  {x:+1, y:+0}, {x:-1, y:+1}],
               [{x:-1, y:-1},  {x:+0, y:-1},  {x:+0, y:+0}, {x:+0, y:+1}],
               [{x:-1, y: 1},  {x:+0, y:+1},  {x:+1, y:+1}, {x:+1, y:+0}],
               [{x: 0, y:-1},  {x:+0, y:+0},  {x:+0, y:+1}, {x:+1, y:+1}]
            ],
         J: [  [{x:-1, y: 0},  {x:+0, y:+0},  {x:+1, y:+0}, {x:+1, y:+1}],
               [{x: 0, y:-1},  {x:+0, y:+0},  {x:+0, y:+1}, {x:-1, y:+1}],
               [{x:-1, y: 0},  {x:-1, y:+1},  {x:+0, y:+1}, {x:+1, y:+1}],
               [{x: 0, y:-1},  {x:+0, y:+0},  {x:+0, y:+1}, {x:+1, y:-1}]
            ],
      };
   }

   /** Returngs the possibles IDs for tetrominos */
   static get ID() {
      return "OTZSILJ";
   }

   static get randomId() {
      return Shape.ID[Math.floor(Math.random() * Shape.ID.length)];
   }
}