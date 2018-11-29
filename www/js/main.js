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
      // Game management -------------------------------------------------------
      this.tetris = new Tetris();                     // The game

      // Timing management -----------------------------------------------------
      this.timeMsCurr  = performance.now();           // Time stamp on current update
      this.timeMsPrev  = performance.now();           // Time stamp on previous update
      this.timeMsDelta = 0;                           // Elapsed time since last update
      this.timeMsAnim  = 0;                           // Timer used to manage animations

      // State machine management ----------------------------------------------
      this.states    = {
         title:  0,           // Display title
         config: 1,           // Display configuration
         play:   2,           // Display the game
         pause:  3,           // Display paused game
         over:   4,           // Display Game over
         delete: 5,           // Display line deletion animation
         level:  6,           // Display level change screen
      };
      this.stateCurr = this.states.title;     // Current state
      this.statePrev = null;                          // Previous state

      // Graphical display -----------------------------------------------------
      this.size = 32;                                 // Pixel size of one block

      this.cnvGame = this.getHtml("#game")[0];        // Display for the game
      this.ctxGame = this.cnvGame.getContext("2d");   // Drawing context for the game
      this.cnvGame.width  = 384;
      this.cnvGame.height = 704;

      this.cnvNext = this.getHtml("#next")[0];        // Display for the next piece
      this.ctxNext = this.cnvNext.getContext("2d");   // Drawing context
      this.cnvNext.width  = 160;
      this.cnvNext.height = 96;

      // Event managements -----------------------------------------------------
      this.inputs = new UserInput();

      this.inputs.defineKeys({
         "ArrowLeft":  "left",
         "ArrowRight": "right",
         "ArrowDown":  "drop",
         "ArrowUp":    "rotate",
         "Enter":      "action",
      });

      this.inputs.defineClicks({
         "btnLeft":     "left",
         "btnRight":    "right",
         "btnDrop":     "drop",
         "btnRotate":   "rotate",
         "btnAction":   "action",
      });

      this.cnvGame.focus();

      // Start game update
      this.stateMachine();
   }
  
   /** Game refresh loop, state machine entry point */
   stateMachine() {
      // request next frame update
      requestAnimationFrame( () => this.stateMachine() );

      // Manages the timers (compute the elapsed time)
      this.timeMsCurr  = performance.now();
      this.timeMsDelta = this.timeMsCurr - this.timeMsPrev;
      this.timeMsPrev  = this.timeMsCurr;

      this.getHtml("#debug")[0].innerText =
            " left  " + this.inputs.is('left') +
            " right " + this.inputs.is('right');
      //   this.timeMsAnim + " / " + this.stateCurr + " / " + this.statePrev;

      // Call the state machine
      let init = this.stateCurr !== this.statePrev;
      this.statePrev = this.stateCurr;
      switch (this.stateCurr) {
         case this.states.title  : this.stateCurr = this.stateTitle(init);  break;
         case this.states.config : this.stateCurr = this.stateConfig(init); break;
         case this.states.play   : this.stateCurr = this.statePlay(init);   break;
         case this.states.pause  : this.stateCurr = this.statePause(init);  break;
         case this.states.delete : this.stateCurr = this.stateDelete(init); break;
         case this.states.level  : this.stateCurr = this.stateLevel(init);  break;
         case this.states.over   : this.stateCurr = this.stateOver(init);   break;
         default                 : this.stateCurr = this.states.title;      break;
      }
   }
  
   /** Display the title page */
   stateTitle(init) {
      this.timeMsAnim = (init) ? 0 : this.timeMsAnim + this.timeMsDelta;

      // Change state on action key
      if (this.inputs.is('action')) {
         this.inputs.stop('action');
         this.tetris.start();
         return this.states.play;
      }

      // Title animation is done here ------------------------------------------
      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
      if (this.timeMsAnim < 750) {
         this.writeCenterText( this.ctxGame,
            "Press ENTER to start",
            (this.cnvGame.width  / 2) || 0,
            (this.cnvGame.height / 2) || 0,
            24, "#ffaabb", "gamefont"
         );
      }
      else if (this.timeMsAnim > 1000) {
         this.timeMsAnim = 0;
      }

      return this.states.title;
   }
  
   /** Game configuration screen */
   stateConfigure(init) {
      // TODO
   }

   /** Display game while playing */
   statePlay(init) {
      // Change state on action key
      if (this.inputs.is('action')) {
         this.inputs.stop('action');
         return this.states.pause;
      }

      // Update the game logic
      this.tetris.update(this.timeMsDelta, this.inputs);

      // The "nextLevel" flag is tested when the line deletion state is finished
      // because this flag is always set after some lines were completed

      if      (this.tetris.gameOver)                 { return this.states.over;   }
      else if (this.tetris.linesToDelete.length > 0) { return this.states.delete; }
      
      // Compute the pixel shift for smooth movements
      let oy = this.tetris.falling  * this.size * 
               this.tetris.timeMsFall / this.tetris.getLevel().dropSpd;
      let ox = -this.tetris.moving  * this.size * 
               (1 - this.tetris.timeMsMove / this.tetris.getLevel().moveSpd);

      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
      this.drawBoard();
      this.drawShape(this.ctxGame, this.tetris.pieceGhost, 0, 0, ' ');
      this.drawShape(this.ctxGame, this.tetris.pieceCurr, ox, oy);

      this.displayData();

      return this.states.play;
   }

   /** Shows the line deletion animation */
   stateDelete(init) {
      this.timeMsAnim = (init) ? 0 : this.timeMsAnim + this.timeMsDelta;

      if (this.tetris.linesToDelete.length === 0 || this.timeMsAnim >= 300) {
         this.tetris.linesToDelete = [];
         if (this.tetris.mode === 'sprint') {
            return (this.tetris.nextLevel) ? this.states.level : this.states.play;
         }
         else {
            return this.states.play;
         }

      }

      let color = "#000";

      if (this.timeMsAnim < 100) {
         color = "rgba(255, 255, 255, 0.25)";
      }
      else if (this.timeMsAnim < 200) {
         color = "rgba(0, 0, 0, 0.25)";
      }

      for( let y of this.tetris.linesToDelete) {
         for (let x = 0; x < this.tetris.board.width; x++) {
            this.drawBlock(this.ctxGame, color, this.size * x, this.size * y);
         }
      }

      return this.states.delete;
   }

   /** Shows a pause screen when a level is completed */
   stateLevel(init) {
      this.timeMsAnim = (init) ? 0 : this.timeMsAnim + this.timeMsDelta;

      if (this.timeMsAnim >= 1000) {
         return this.states.play;
      }

      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);

      this.writeCenterText(
         this.ctxGame,
         "Next level will start soon",
         (this.cnvGame.width  / 2) || 0,
         (this.cnvGame.height / 2) || 0,
         24,
         "#ffaabb",
         "gamefont"
      );      

      return this.states.level;
   }

   /** Shows the pause screen */
   statePause(init) {
      this.timeMsAnim = (init) ? 0 : this.timeMsAnim + this.timeMsDelta;

      if (this.inputs.is('action')) {
         this.inputs.stop('action');
         return this.states.play;
      }

      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);

      if (this.timeMsAnim > 1000) {
         this.timeMsAnim = 0;
      }
      else if (this.timeMsAnim < 500) {
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

      return this.states.pause;
   }
  
   /** Show the game over screen */
   stateOver(init) {
      this.timeMsAnim = (init) ? 0 : this.timeMsAnim + this.timeMsDelta;

      // Show gameover for 2 seconds
      if (this.timeMsAnim > 2000) {
         return this.states.title;
      }

      this.ctxGame.clearRect(0, 0, this.cnvGame.width, this.cnvGame.height);
      this.writeCenterText( this.ctxGame, "Game is over",
         (this.cnvGame.width / 2) || 0, (this.cnvGame.height / 2) || 0,
         24, "#ffaabb", "gamefont");

      return this.states.over;
   }

   /** Draw one block (a square) at the given position */ 
   drawBlock(ctx, idColor, x, y) {
      let img = document.getElementById("square" + idColor);
      if (img) {
         // Image exist -> copy it in the canvas
         ctx.drawImage(img,x, y, this.size, this.size);
      }
      else {
         // Fallback, draw the block in the canvas
         let w2 = 1;
         ctx.save();

         // Draw the filled square
         ctx.fillStyle = idColor;
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
   }

   /** Draw the entire play field (not the moveing shape) */
   drawBoard() {
      for (let y = 0; y < this.tetris.board.height; y++) {
         for (let x = 0; x < this.tetris.board.width; x++) {
               let id = this.tetris.board.getCell(x, y);
               if (id !== this.tetris.board.EMPTY) {
                  this.drawBlock(this.ctxGame, id, x * this.size, y * this.size);
               }
         }
      }
   }

   /** Draw the shape in the given canvas */
   drawShape(ctx, shape, ox, oy, id) {
      let that  = this;

      // Set default value for optional parameters
      id = id || shape.id;
      ox = ox || 0;
      oy = oy || 0;

      // Draw the blocks
      shape.foreach(function(x, y) {
         that.drawBlock(ctx, id, x * that.size + ox, y * that.size + oy);
      });
   }   

   /** Compute the bounding box for a given shape */
   boundingBox(shape) {
      let r = {x0 : 10, x1 : -10, y0 : 10, y1 : -10};

      shape.foreach( function(x, y) {
         if ((x <= r.x0)) r.x0 = x;
         if ((x >= r.x1)) r.x1 = x;
         if ((y <= r.y0)) r.y0 = y;
         if ((y >= r.y1)) r.y1 = y;
      });

      return r;
   }

   /** Center a text at a given point */
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
      document.getElementById("score").innerText = this.tetris.score;
      document.getElementById("lines").innerText = this.tetris.line;
      document.getElementById("level").innerText = this.tetris.level;  

      // Compute the center point of the shape
      let box = this.boundingBox(this.tetris.pieceNext);
      let cx = Math.round((this.cnvNext.width  - (box.x1 + box.x0 + 1) * this.size) / 2);
      let cy = Math.round((this.cnvNext.height - (box.y1 + box.y0 + 1) * this.size) / 2);

      this.ctxNext.clearRect(0, 0, this.cnvNext.width, this.cnvNext.height);
      this.drawShape(this.ctxNext, this.tetris.pieceNext, cx, cy);
   }

   getHtml(selector) {
      return document.querySelectorAll(selector);
   }   
}

//------------------------------------------------------------------------------
// GAME LOGIC
class Tetris {
   /** Create a new instance of the game logic */
   constructor(mode) {
      this.timeMsLevel  = 0;                          // Timer used to limit level duration
      this.timeMsMove   = 0;                          // Timer used to limit move speed
      this.timeMsRotate = 0;                          // Timer used to limit move speed
      this.timeMsFall   = 0;                          // Timer used to limit fall speed
  
      this.board = new Board(12, 22);                 // Game board (array of strings)
      this.mode = mode || 'normal';                   // 'finished', 'normal' or 'sprint' game
      this.level = 1;                                 // Game level
      this.score = 0;                                 // Game score
      this.line = 0;                                  // Counts the deleted lines

      this.pieceCurr = null;                          // Current piece
      this.pieceNext = null;                          // Next piece
      this.pieceGhost = null;                         // Ghost piece

      // Theses are used by the pixel scrolling
      this.falling     = 1;                           // Fall direction
      this.moving      = 0;                           // Move direction

      // Theses are used to change the display state
      this.linesToDelete = [];                        // List of lines to delete
      this.gameOver      = false;                     // Is game over or not
      this.nextLevel     = false;                     // Level just changed
   }

   /** Start a new game, action depends on the selected mode */
   start(mode) {
      this.board.clear();

      this.level = 1;
      this.line = 0;
      this.score = 0;

      this.pieceCurr = new Shape({x: this.board.width / 2 - 2});
      this.pieceNext = new Shape({x: this.board.width / 2 - 2});
      this.pieceGhost = new Shape(this.pieceCurr);

      this.timeMsLevel  = 0;
      this.timeMsMove   = 0;
      this.timeMsRotate = 0;
      this.timeMsFall   = 0;

      this.mode = mode || 'normal';
      this.gameOver = false;
      this.linesToDelete = [];

      if (this.mode === 'sprint') {
         this.board.insertLines(5);
      }
   }

   /** Updates the game "model" */
   update(timeMsDelta, actions) {
      // Manage timings
      this.timeMsLevel += timeMsDelta;
      this.timeMsMove  += timeMsDelta;
      this.timeMsFall  += timeMsDelta;

      this.nextLevel = false;

      if ((this.mode === 'sprint') && (this.timeMsLevel > this.getLevel().maxTime)) {
         this.gameOver = true;
         return;
      }

      // Manage the actions
      let temp = new Shape(this.pieceCurr);
      this.falling = temp.move(this.board, 0, +1) ? 1 : 0;

      // Move timer is over
      if (this.timeMsMove >= this.getLevel().moveSpd ||
          actions.isEdge('left') || actions.isEdge('right')) {
         let firstMove = this.timeMsFall < 20;
         this.moving = 0;

         // Try to move the shape as requested by the player
         if (actions.is('left')) {
            actions.clearEdge('left');
            if (firstMove || temp.move(this.board,-1,0)) {
               if (this.pieceCurr.move(this.board, -1, 0)) {
                  this.moving = -1;
               }
            }
         }
   
         if (actions.is('right')) {
            actions.clearEdge('right');
            if (firstMove || temp.move(this.board,1,0)) {
               if (this.pieceCurr.move(this.board, +1, 0)) {
                  this.moving = +1;
               }
            }
         }

         if (actions.is('rotate')) {
            actions.clearEdge('rotate');
            this.pieceCurr.rotate(this.board, 1);
            actions.stop('rotate');
         }

         // Compute the ghost piece
         this.pieceGhost.x = this.pieceCurr.x;
         this.pieceGhost.y = this.pieceCurr.y;
         this.pieceGhost.orientation = this.pieceCurr.orientation;
         while(this.pieceGhost.move(this.board, 0, 1)) {
            // nothing to do
         }

         this.timeMsMove = 0;
      }

      // Fall timer is over
      if (actions.is('drop') || this.timeMsFall >= this.getLevel().dropSpd) {
         actions.clearEdge('drop');
         this.timeMsFall = 0;

         // Move the shape down and exit if the move was possible
         if (!this.pieceCurr.move(this.board, 0, +1)) {
            // Stop key repetition for the next piece
            actions.stop('drop');

            // Write the shape in the game field
            this.pieceCurr.write(this.board);

            // Delete completed lines
            this.linesToDelete = this.board.searchFullLines();
            if (this.linesToDelete.length > 0) {
               this.board.deleteLines(this.linesToDelete);
               this.computeScore(this.linesToDelete);
            }

            // Game is over when the shape is still at the top of the play field
            if (this.pieceCurr.y === 0) {
               this.gameOver = true;
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
      if (this.mode === 'normal') {
         this.score += 1;                    // Score for a new piece
         this.score += lines.length * 100;   // Score for completed lines
         this.line  += lines.length;

         if (this.line >= this.getLevel().nbLine) {
            this.level += 1;
            this.nextLevel = true;
         }
      }
      else {
         this.score += 1;                    // Score for a new piece
         this.score += lines.length * 100;   // Score for completed lines
         this.line  += lines.length;

         if (this.line >= 5) {
            this.level += 1;
            this.nextLevel = true;
            this.board.insertLines(10);
         }
      }
   }

   /** Returns the current level definition */
   getLevel() {
      let levelData = [
            {nbLine:   1, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 500, moveSpd: 80}, // not used
            {nbLine:   1, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 500, moveSpd: 80}, // 1
            {nbLine:  10, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 450, moveSpd: 80}, // 2
            {nbLine:  15, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 400, moveSpd: 80}, // 3
            {nbLine:  20, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 350, moveSpd: 80}, // 4
            {nbLine:  25, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 300, moveSpd: 80}, // 5
            {nbLine:  30, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 250, moveSpd: 80}, // 6
            {nbLine:  35, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 200, moveSpd: 80}, // 7
            {nbLine:  40, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 150, moveSpd: 80}, // 8
            {nbLine:  45, maxTime: Number.MAX_SAFE_INTEGER, dropSpd: 100, moveSpd: 80}, // 9
            {nbLine: 999, maxTime: Number.MAX_SAFE_INTEGER, dropSpd:  50, moveSpd: 80}  // 10
         ];

      if (this.mode === 'sprint') {
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
   clear() {
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
         if (result[idx] === this.EMPTY) {
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
                   (board.getCell(x,y) === board.EMPTY);
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

   /** Returns the possibles IDs for tetrominos */
   static get ID() {
      return "OTZSILJ";
   }

   static get randomId() {
      return Shape.ID[Math.floor(Math.random() * Shape.ID.length)];
   }
}