// JavaScript Document

var mobserv = {
	zindex : 3,
	history : [],
	geolocation : {
		watchID : null,
		watchPosition : function($dom){
			mobserv.geolocation.watchID = navigator.geolocation.watchPosition(function(pos){
				if ($dom && $dom.attr('id') == 'gps'){
					$dom.find('#gpslat').html(pos.coords.latitude); 		
					$dom.find('#gpslng').html(pos.coords.longitude); 		
					$dom.find('#gpsacr').html(pos.coords.accuracy); 		
					$dom.find('#gpsalt').html(pos.coords.altitude); 		
					$dom.find('#gpsact').html(pos.coords.altitudeAccuracy); 		
					$dom.find('#gpsdir').html(pos.coords.heading); 		
				}
			}, function(error){
				if ($dom && $dom.hasClass('view') == 'gps'){
					mobserv.error($dom,'Erro',error);
				}
			}, { timeout: 60000 });
		},
		clearWatch : function(){
			if (mobserv.geolocation.watchID){
				navigator.geolocation.clearWatch(mobserv.geolocation.watchID);
			}
		}
	},
	nav : {
		toView : function($view){
			var $current = $('.view.current');
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
				$current.transition({ opacity:0 }, 1000, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 1000, function(){
					$view.addClass('current');
				});
				$view.trigger('show');
				$current.trigger('hide');
			} else if ($view.length == 1){
				$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 1000, function(){
					$view.addClass('current');
				});
				$view.trigger('show');
			}
			mobserv.zindex++;
		},
		forward : function($view){
			var $current = $('.view.current');
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
				mobserv.history.push($current);
				$current.transition({ x:0, opacity:0 }, 1000, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:'50%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ x:0, opacity:1 }, 1000, function(){
					$view.addClass('current');
				});
				$view.trigger('show');
				$current.trigger('hide');
			}
			mobserv.zindex++;
		},
		back : function(){
			if (mobserv.history.length > 0){
				var $current = $('.view.current');
				$view = mobserv.history.pop();
				console.log('link',$view,$current);
				if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
					$current.transition({ x:'50%', opacity:0 }, 1000, function(){
						$current.hide().removeClass('current');
					});
					$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 1000, function(){
						$view.addClass('current');
					});
					$view.trigger('show');
					$current.trigger('hide');
				}
				mobserv.zindex++;
			}
		},
		link : function($a){
			var view = $a.data('view'), $view;
			if (view){
				$view = $('#'+view);
			}
			var direction = $a.data('direction');
			if ($view){
				if (direction == 'forward'){
					mobserv.nav.forward($view);
				} else {
					mobserv.nav.toView($view);
				}
			} else if (direction == 'back'){
				mobserv.nav.back();
			}
		},
	},
	error : function(name,error){
		var $notify = $('#notify');
		$notify.find('strong').text(name+' #'+error.code);
		$notify.find('span').text(error.message);
		$notify.removeClass('green orange blue').addClass('red').css({bottom:'-50%', opacity:0}).show().transition({ bottom:0, opacity:1 }, 400, function(){
			setTimeout(function(){
				$notify.transition({ opacity:0 }, 1000, function(){
					$notify.hide();
				});
			},5000);
		});
	}
}

$(function(){
	
	var startX, startY, endX, endY, pull;
	
	$(document)
		.on('touchstart',function(event){
			$('.hover').removeClass('hover');
		})
		.on('tap','#nav a',function(){
			var $this = $(this).addClass('hover');
			$('.view.current').transition({ x:0 }, 1000,function(){
				$('#nav').removeClass('active');
				mobserv.nav.link($this);
				mobserv.history = [];
			});
		})
		.on('tap','section a, section .link, header .link',function(){
			var $this = $(this).addClass('hover');
			mobserv.nav.link($this);
		})
		.on('tap','.menu',function(){
			var $this = $(this).addClass('hover');
			if ($('#nav').hasClass('active')){
				$('.view.current').transition({ x:0 }, 1000,function(){
					$('#nav').removeClass('active');
				});
			} else {
				$('#nav').addClass('active');
				$('.view.current').transition({ x:'80%' }, 1000);
			}
		})
		.on('touchstart','.section',function(event){
			startX = event.originalEvent.touches[0].pageX;
			startY = event.originalEvent.touches[0].pageY;
			var $section = $(this);
			var $puller = $section.children('.puller');
			var height;
			if ($puller.length){
				height = $puller.height()
				$puller.data('height',height);
				if (height == 0){
					$puller.find('strong').text('Solte para atualizar');	
				}
			}
		})
		.on('touchmove','.section',function(event){
			endX = event.originalEvent.touches[0].pageX;
			endY = event.originalEvent.touches[0].pageY;
			var $section = $(this);
			var $puller = $section.children('.puller');
			if ($puller.length > 0 && $section.scrollTop() == 0 && endY > startY){
				var val = (endY-startY+$puller.data('height'))/2;
				$puller.show().height(val).find('strong').css('opacity',val/40);
				pull = $puller;
			} else {
				pull = null;	
			}
		})
		.on('touchend','.section',function(event){
			if (pull){
				if (startY+80 > endY){
					pull.transition({ height:0 }, 100);
				} else {
					pull.transition({ height:40 }, 200,function(){
						pull.find('strong').text('Atualizando...');
						pull.parent().trigger('pull');
					});
					setTimeout(function(){
						pull.transition({ height:0 }, 100);
					},3000);
				}
			}
		})
		
		
		.on('show','#gps',function(){
			var $this = $(this);
			mobserv.geolocation.watchPosition($this);
		})
		.on('hide','#gps',function(){
			mobserv.geolocation.clearWatch();
		})
		
	;
	
		
	setTimeout(function(){mobserv.nav.toView('home');},1000);
	
	if (device.platform == 'iOS') $('.view').addClass('ios');
	
});
