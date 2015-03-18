// JavaScript Document

var mobserv = {
	zindex : 3,
	history : [],
	nav : {
		toView : function($view){
			var $current = $('.view.current');
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
				$current.transition({ opacity:0 }, 200, function(){
					$current.hide().removeClass('current');
				});
				$view.css({left:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 200, function(){
					$view.addClass('current');
				});
			} else if ($view.length == 1){
				$view.css({left:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 200, function(){
					$view.addClass('current');
				});
			}
			mobserv.zindex++;
		},
		forward : function($view){
			var $current = $('.view.current');
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
				mobserv.history.push($current);
				$current.transition({ left:'-50%', opacity:0 }, 200, function(){
					$current.hide().removeClass('current');
				});
				$view.css({left:'50%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ left:0, opacity:1 }, 200, function(){
					$view.addClass('current');
				});
			}
			mobserv.zindex++;
		},
		back : function(){
			if (mobserv.history.length > 0){
				var $current = $('.view.current');
				$view = mobserv.history.pop();
				console.log('link',$view,$current);
				if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
					$current.transition({ left:'50%', opacity:0 }, 200, function(){
						$current.hide().removeClass('current');
					});
					$view.css({left:'-50%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ left:0, opacity:1 }, 200, function(){
						$view.addClass('current');
					});
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
	}
}

$(function(){
	
	$(document)
		.on('tapstart scrollend',function(event){
			$('.hover').removeClass('hover');
		})
		.on('tapend','#nav a',function(){
			$(this).addClass('hover');
		})
		.on('tapend','section a, section .link, header .link',function(){
			$(this).addClass('hover');
		})
		.on('tapend','.menu',function(){
			$(this).addClass('hover');
		})
		.on('singletap','#nav a',function(){
			$this = $(this).removeClass('hover');
			$('.view.current').transition({ left:0 }, 200,function(){
				$('#nav').removeClass('active');
				mobserv.nav.link($this);
				mobserv.history = [];
			});
		})
		.on('singletap','section a, section .link, header .link',function(){
			$this = $(this);
			mobserv.nav.link($this);
		})
		.on('singletap','.menu',function(){
			$this = $(this);
			if ($('#nav').hasClass('active')){
				$('.view.current').transition({ left:0 }, 200,function(){
					$('#nav').removeClass('active');
				});
			} else {
				$('#nav').addClass('active');
				$('.view.current').transition({ left:'80%' }, 200);
			}
		})
	;
	
	setTimeout(function(){mobserv.nav.toView('home');},1000);
	
});
