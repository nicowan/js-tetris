/**
 * This class let's you manage keyboard inputs as well as click on document
 * elements. Both are connected to "actions" that are used in the application
 */
class UserInput {
   constructor() {
      /** Associative array which links an action to a ActionState object */
      this.actions = {};
      
      /** Associative array which links a key code to an action (ArrowLeft -> left)*/
      this.keys = {};

      /** Associative array which links a html id to an action (btnLeft -> left)*/
      this.clicks = {};

      // Attach keyboard events
      document.addEventListener("keydown", (ev) => this.keyUpDownEvent(ev));
      document.addEventListener("keyup",   (ev) => this.keyUpDownEvent(ev));
   }

   /**
    * Adds an action to the actions array if it does not exist
    * @param {String} actionName The name of the action
    */
   addAction(actionName) {
      if (this.actions[actionName] === undefined) {
         this.actions[actionName] = {
            before: false,    // action state on last update
            press:  false,    // action state on current update
            edge:   false     // action state changed since last update
         };
      }
   }

   /**
    * Read the selected action object
    * @param {String} actionName The nae of the action to retrieve
    * @returns {Action} The selected action object
    */
   getAction(actionName) {
      if (this.actions[actionName] === undefined) {
         return null;
      }

      return this.actions[actionName];
   }

   /**
    * Binds the key code to an action
    * @param {Object} actionBindings Associative array which links a key code to an action
    *                                ex { "ArrowLeft" : "left", "ArrowRight" : "Right", } 
    */
   defineKeys(actionBindings) {
      for(let key in actionBindings) {
         this.addAction(actionBindings[key]);
         this.keys[key] = actionBindings[key];
      }
   }

   /**
    * Binds HTML ID to an action.
    * @param {Object} actionBindings = Associative array which links a Html id to an action
    *                                  ex { "btnLeft" : "left", "btnRight" : "Right", } 
    */
   defineClicks(actionBindings) {
      for(let htmlId in actionBindings) {
         this.addAction(actionBindings[htmlId]);
         this.clicks[htmlId] = actionBindings[htmlId];

         let elem = document.getElementById(htmlId);
         elem.addEventListener("mousedown",  (ev) => { this.mouseDown(ev); });
         elem.addEventListener("mouseup",    (ev) => { this.mouseUp(ev);   });
         elem.addEventListener("touchstart", (ev) => { this.mouseDown(ev); });
         elem.addEventListener("touchend",   (ev) => { this.mouseUp(ev);   });
      }
   }

   /**
 * Tells if the current action is triggered or not
 * @param {String} actionName Name of the action to check ('left', right', ...)
 * @returns {boolean} true if action is active, otherwise false
 */
   is(actionName) {
      let action = this.getAction(actionName);
      if (action === null) throw "UserInput has no action called '" + actionName + "'";
      return action.press;
   }

   /**
    * Unset the named action. It is used to avoid key repetition
    * @param {String} actionName The action's name
    */
   stop(actionName) {
      let action = this.getAction(actionName);
      if (action !== null) {
         action.press = false;
         action.edge = false;
      }
   }

   /**
    * Unset the named action's edge detector.
    * @param {String} actionName The action's name
    */
   clearEdge(actionName) {
      let action = this.getAction(actionName);
      if (action !== null) {
         action.edge = false;
      }
   }

   /**
    * Tells if the current action has seen a transition on its value
    * @param {String} actionName The action's name
    */
   isEdge(actionName) {
      let action = this.getAction(actionName);
      return (action !== null) && action.edge;
   }

   /**
    *  Callback for mouse down / touch start events
    * @param {MouseEvent} event The mouse / touch event definition
    */
   mouseDown(event) {
      let action = this.getAction(this.clicks[event.target.id]);
      action.before = action.press;
      action.press  = true;
      event.preventDefault();
   }

   /**
    *  Callback for mouse up / touch end events
    * @param {MouseEvent} event The mouse / touch event definition
    */
   mouseUp(event) {
      let action = this.getAction(this.clicks[event.target.id]);
      action.before = action.press;
      action.press  = false;
      event.preventDefault();
   }

   /**
    * Store the state of the pressed / released keys
    * @param {KeyEvent} event Key event data
    */
   keyUpDownEvent(event) {
      let pressed   = (event.type === "keydown");
      let action    = this.getAction(this.keys[event.code]);

      if (action !== null) {
         action.edge   = action.edge || (pressed && !action.before);
         action.before = action.press;
         action.press  = pressed;
         event.preventDefault();
      }
   }
}