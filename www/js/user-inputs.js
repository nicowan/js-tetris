/**
 * Manages the user inputs
 * Put here in the hope I will do it a clean and extendable way later.
 */
class UserInput {
   constructor() {
      let btn = null;
      this.actions = {};                     // action   -> { action data }
      this.keys    = {};                     // key code -> { action data }

      // Attach keyboard events
      document.addEventListener("keydown", (ev) => this.keyUpDownEvent(ev));
      document.addEventListener("keyup",   (ev) => this.keyUpDownEvent(ev));

      btn = document.getElementById("btnLeft");
      btn.addEventListener("mousedown", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("mouseup",   (ev) => { this.mouseUp(ev);   });
      btn.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });

      btn = document.getElementById("btnRight");
      btn.addEventListener("mousedown", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("mouseup",   (ev) => { this.mouseUp(ev);   });
      btn.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });

      btn = document.getElementById("btnRotate");
      btn.addEventListener("mousedown", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("mouseup",   (ev) => { this.mouseUp(ev);   });
      btn.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });

      btn = document.getElementById("btnDrop");
      btn.addEventListener("mousedown", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("mouseup",   (ev) => { this.mouseUp(ev);   });
      btn.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });

      btn = document.getElementById("btnAction");
      btn.addEventListener("mousedown", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("mouseup",   (ev) => { this.mouseUp(ev);   });
      btn.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
      btn.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });
   }

   mouseDown(ev) {
      let btnId = ev.target.id.substring(3).toLowerCase();
      this.actions[btnId].last = this.actions[btnId].pressed;
      this.actions[btnId].pressed = true;
   }

   mouseUp(ev) {
      let btnId = ev.target.id.substring(3).toLowerCase();
      this.actions[btnId].last = this.actions[btnId].pressed;
      this.actions[btnId].pressed = false;
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
      }

      for( let code in this.KEYS() ) {
         if ( this.KEYS()[code] == event.code) {
            event.preventDefault();
         }
      }

   }

   addKeyBinding(actionForKeys) {
      for(let action in actionForKeys) {
         this.actions[action] = { last: false, pressed: false };
         this.keys[actionForKeys[action]] = this.actions[action];
      }
   }

   is(name) {
      return (this.actions[name] !== undefined && this.actions[name].pressed);
   }

   clr(name) {
      if (this.actions[name] !== undefined) {
         this.actions[name].pressed = false;
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

   /** The keyboard bindings action -> keyCode */
   KEYS() {
      return {
         left:   "ArrowLeft",
         right:  "ArrowRight",
         drop:   "ArrowDown",
         rotate: "ArrowUp",
         action: "Enter"
      };
   }

}