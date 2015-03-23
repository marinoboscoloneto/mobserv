// JavaScript Document
$.event.special.tap = {
	config : {
		touchDistance : 10,
		swipeDistance : 100,
		holdTime : 500,
	},
	// Abort tap if touch moves further than 10 pixels in any direction
	// Abort tap if touch lasts longer than half a second
	setup: function() {
		var self = this,
		$self = $(self);
	
		// Bind touch start"
		$self.on('touchstart', function(startEvent) {
			// Save the target element of the start event
			var target = startEvent.target,
			touchStart = startEvent.originalEvent.touches[0],
			startX = touchStart.pageX,
			startY = touchStart.pageY,
			touchDistance = $.event.special.tap.config.touchDistance,
			timeout;
			
			function removeTapHandler() {
				clearTimeout(timeout);
				$self.off('touchmove', moveHandler).off('touchend', tapHandler);
			};
			
			function tapHandler(endEvent) {
				removeTapHandler();
				
				// When the touch end event fires, check if the target of the
				// touch end is the same as the target of the start, and if
				// so, fire a click.
				if (target == endEvent.target) {
					$.event.simulate('tap', self, endEvent);
				}
			};
			
			// Remove tap and move handlers if the touch moves too far
			function moveHandler(moveEvent) {
				var touchMove = moveEvent.originalEvent.touches[0],
				moveX = touchMove.pageX,
				moveY = touchMove.pageY,
				absX = Math.abs(moveX - startX),
				absY = Math.abs(moveY - startY);
				
				if (absX > touchDistance || absY > touchDistance) {
					removeTapHandler();
				}
			};
			
			// Remove the tap and move handlers if the timeout expires
			timeout = setTimeout(removeTapHandler, $.event.special.tap.config.holdTime);
			
			// When a touch starts, bind a touch end and touch move handler
			$self.on('touchmove', moveHandler).on('touchend', tapHandler);
		});
	}
};