// JavaScript Document
$.event.special.tap = {
	config : {
		touchDistance : 20,
		swipeDistance : 100,
		holdTime : 500
	},
	// Abort tap if touch moves further than 20 pixels in any direction
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
					//setTimeout(function(){$.event.simulate('tap', self, endEvent);},80);
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
/*
$.event.special.swipeleft = {
	config : {
		touchDistance : 20,
		swipeDistance : 50
	},
	setup: function() {
		var self = this,
		direction = null;
		$self = $(self);
		$self.on('touchstart', function(startEvent) {
			var target = startEvent.target,
			touchStart = startEvent.originalEvent.touches[0],
			startX = touchStart.pageX,
			startY = touchStart.pageY,
			touchDistance = $.event.special.swipeleft.config.touchDistance,
			swipeDistance = $.event.special.swipeleft.config.swipeDistance;
			
			function removeSwipeHandler() {
				$self.off('touchmove', moveHandler).off('touchend', swipeHandler);
				console.log('removeSwipeHandler');
			};
			
			function swipeHandler(endEvent) {
				removeSwipeHandler();
				if (direction){
					$.event.simulate('swipeleft', self, endEvent);
					console.log('swipeHandler',direction);
				}
			};

			function moveHandler(moveEvent) {
				var touchMove = moveEvent.originalEvent.touches[0],
				moveX = touchMove.pageX,
				moveY = touchMove.pageY,
				absX = Math.abs(moveX - startX)
				absY = Math.abs(moveY - startY);
				if (absY > touchDistance){
					removeSwipeHandler();	
					direction = null;
				} else {
					if (moveX <= startX && absX > swipeDistance){
						direction = 'left';
					} else {
						direction = null;	
					}
					$self.trigger('swiping',[moveX,moveY]);
				}
				console.log('moveHandler',absY > touchDistance);
			};
			$self.on('touchmove', moveHandler).on('touchend', swipeHandler);
		});
	}
};
$.event.special.swiperight = {
	config : {
		touchDistance : 20,
		swipeDistance : 50
	},
	setup: function() {
		var self = this,
		direction = null;
		$self = $(self);
		$self.on('touchstart', function(startEvent) {
			var target = startEvent.target,
			touchStart = startEvent.originalEvent.touches[0],
			startX = touchStart.pageX,
			startY = touchStart.pageY,
			touchDistance = $.event.special.swiperight.config.touchDistance,
			swipeDistance = $.event.special.swiperight.config.swipeDistance;
			
			function removeSwipeHandler() {
				$self.off('touchmove', moveHandler).off('touchend', swipeHandler);
				console.log('removeSwipeHandler');
			};
			
			function swipeHandler(endEvent) {
				removeSwipeHandler();
				if (direction){
					$.event.simulate('swiperight', self, endEvent);
					console.log('swipeHandler',direction);
					direction = null;
				}
			};

			function moveHandler(moveEvent) {
				var touchMove = moveEvent.originalEvent.touches[0],
				moveX = touchMove.pageX,
				moveY = touchMove.pageY,
				absX = Math.abs(moveX - startX)
				absY = Math.abs(moveY - startY);
				if (absY > touchDistance){
					removeSwipeHandler();	
					direction = null;
				} else {
					if (moveX > startX && absX > swipeDistance){
						direction = 'right';
					} else {
						direction = null;	
					}
					$self.trigger('swiping',[moveX,moveY]);
				}
				console.log('moveHandler',absY > touchDistance);
			};
			$self.on('touchmove', moveHandler).on('touchend', swipeHandler);
		});
	}
};
*/