/**
 * Timing class lets you measure several timings in a synchronous way
 */
class Timing {
   constructor(timers) {
      this.delay  = 0;        // Delay between 2 update
      this.fps    = NaN;      // Compute FPS based on update rate
      this.prev   = NaN;      // System time on last call
      this.timers = {};       // Set of active timers

      for(let timer of timers) {
         this.addTimer(timer);
      }
   }

   /** Update all timers based on the last call to this method */
   update() {
      this.refresh();
      this.fps   = this.filterIIR(this.fps, this.delay, 0.01);

      for(let timer in this.timers) {
         this.timers[timer] += this.delay;
      }
   }

   /** Refresh the reference time without updating the timers */
   refresh() {
      let curr = performance.now();
      if ( isNaN(this.prev)) {
         this.prev = curr;
         this.fps  = 16.7;
      }
      this.delay = curr - this.prev;
      this.prev  = curr;
   }


   /** Add the named timer to the timer set */
   addTimer(name) {
      this.timers[name] = 0;
   }

   /** Delete the named timer from the timer set */
   delTimer(name) {
      delete this.timers[name];
   }

   /** Clears the named timer */
   clrTimer(name) {
      this.timers[name] = 0;
   }

   /** Returns value of the named timer in ms */
   getTimer(name) {
      return this.timers[name];
   }

   /** Compute the response of an IIR filter. Used to filter the fps timer */
   filterIIR(prev, curr, cutOff) {
      return prev - (prev - curr) * cutOff;
   }
}