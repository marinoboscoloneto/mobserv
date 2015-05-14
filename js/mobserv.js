// JavaScript Document

var mobserv = {
	server : {
		pointer : 0,
		list : [
			{
				type : 'license',
				url : 'http://ws.sourcelab.com.br/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				type : 'license',
				url : 'http://sourcelab.com.br/webservice/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				type : 'license',
				url : 'http://slab.ddns.net/metagen4/webservice/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				type : 'service',
				url : 'http://carriers.ddns.com.br/tms/mobserv/',
				online : false,	
				status : null,
				lastRequest : null
			}
		],
		online : {
			license : false,
			service : false
		},
		test : function(type){
			if (!mobserv.connection.test()) return;
			var pointer = mobserv.server.pointer;
			var server = mobserv.server.list[pointer];
			if (server){
				if (type === server.type){
					server.status = 'Conectando';
					$.ajax({
						type: 'GET', 
						url: server.url, 
						dataType: 'xml', 
						success: function(response,st,xhr){
							if (response !== '' && $(response).find('mobserv').length == 1){
								server.online = true;
								server.status = 'Conectado';
								server.lastRequest = mobserv.now();
								mobserv.server.online.license = server;
								mobserv.log({
									type : 'info',
									name : 'server.test',
									message : server.url+' test successful',
								});
							} else {
								server.online = false;
								server.status = 'Erro de Parser';
								server.lastRequest = mobserv.now();
								mobserv.log({
									type : 'error',
									name : 'server.test',
									message : server.url+' response invalid xml',
								});
								mobserv.server.pointer++;
								mobserv.server.test(type);	
							}
						}, 
						error: function(xhr,st,err){
							server.online = false;
							server.status = 'Erro de Conexão';
							server.lastRequest = mobserv.now();
							mobserv.log({
								type : 'error',
								name : 'server.test',
								message : server.url+' response error ('+((err)?err:'unknown')+')',
							});
							mobserv.server.pointer++;
							mobserv.server.test(type);	
						}, 
						complete: function(){
							if (mobserv.server.pointer == mobserv.server.list.length){
								mobserv.server.pointer = 0;	
							}
						}
					});
				} else {
					mobserv.server.pointer++;
					mobserv.server.test(type);	
				}
			}
		}
	},
	zindex : 3,
	preventTap : false,
	timeoutTap : null,
	history : [],
	device : {
		onready : function(){
			var $dom = $("#deviceinfo");
			if ($dom.length){
				if (typeof device == 'object'){
					if (device.platform == 'iOS') $('.view').addClass('ios');
					$dom.find('#cordova').html(device.cordova); 		
					$dom.find('#model').html(device.model); 		
					$dom.find('#platform').html(device.platform); 		
					$dom.find('#uuid').html(device.uuid); 
					$dom.find('#version').html(device.version); 
				} else {
					mobserv.log({
						type : 'error',
						name : 'device.onready',
						message : 'device property not available',
					});	
				}
			}
		}
	},
	connection : {
		online : false,
		test : function(type){
			var $dom = $("#connectioninfo");
			if (navigator.connection){
				var networkState = navigator.connection.type;
				var states = {};
				states[Connection.UNKNOWN]  = 'Unknown connection';
				states[Connection.ETHERNET] = 'Ethernet connection';
				states[Connection.WIFI]     = 'WiFi connection';
				states[Connection.CELL_2G]  = 'Cell 2G connection';
				states[Connection.CELL_3G]  = 'Cell 3G connection';
				states[Connection.CELL_4G]  = 'Cell 4G connection';
				states[Connection.CELL]     = 'Cell generic connection';
				states[Connection.NONE]     = 'No network connection';
				$dom.find('#conntype').html(states[networkState]);
				if (navigator.connection.type == Connection.NONE){
					$dom.find('#connstatus').html('Offline');
					mobserv.connection.online = false
					mobserv.log({
						type : 'alert',
						name : 'connection.test',
						message : 'no internet connection',
					});
					return false;
				} else {
					$dom.find('#connstatus').html('Online');
					mobserv.connection.online = true;
					return true;
				}
			} else {
				$dom.find('#connstatus').html('Online (default)');
				$dom.find('#conntype').html('Test impossible');	
				mobserv.connection.online = true;
				return true;
			}
		},
	},
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
				var $map = $dom.find("img.map");
				if (!$map.is(':visible')) $map.css({opacity:1}).attr("src",'http://maps.googleapis.com/maps/api/staticmap?center='+pos.coords.latitude+','+pos.coords.longitude+'&amp;zoom=14&amp;size='+$(window).width()+'x200&amp;sensor=false');
			}, function(error){
				if ($dom && $dom.hasClass('view') == 'gps'){
					mobserv.log({
						type : 'error',
						name : 'geolocation.watchPosition',
						code : error.code,
						message : error.message,
					});	
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
				$current.transition({ opacity:0 }, 300, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 300, function(){
					$view.addClass('current');
				});
				$view.trigger('show');
				$current.trigger('hide');
			} else if ($view.length == 1){
				$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 300, function(){
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
				$current.transition({ x:0, opacity:0 }, 300, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:'50%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ x:0, opacity:1 }, 300, function(){
					$view.addClass('current');
				});
				$view.trigger('show');
				$current.trigger('hide');
				console.log('forward',mobserv.history);
			}
			mobserv.zindex++;
		},
		back : function(){
			if (mobserv.history.length > 0){
				var $current = $('.view.current');
				$view = mobserv.history.pop();
				if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
					$current.transition({ x:'50%', opacity:0 }, 400, function(){
						$current.hide().removeClass('current');
					});
					$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 400, function(){
						$view.addClass('current');
					});
					$view.trigger('show');
					$current.trigger('hide');
					console.log('back',mobserv.history);
				}
				mobserv.zindex++;
			}
		},
		link : function($a){
			if (mobserv.preventTap) return;
			clearTimeout(mobserv.timeoutTap);
			mobserv.preventTap = true;
			mobserv.timeoutTap = setTimeout(function(){mobserv.preventTap = false},600);
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
	notify : function(name,title,error){
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
	},
	'log' : function(obj){
		var html = ''+
		'<div class="logline '+((obj.type)?obj.type:'')+'"><b class="date">['+mobserv.now()+']</b> '+
		((obj.name)?'<b class="name">'+obj.name+'</b> ':'')+
		((obj.title)?'<b class="title">'+obj.title+'</b> ':'')+
		((obj.code)?'<span class="code">'+obj.code+'</span> ':'')+
		((obj.message)?'<span class="message">'+obj.message+'</span> ':'')+
		'</div>';
		$("#log .section").append(html);
	},
	now : function(){
		var d = new Date;
		return [
			d.getFullYear(),
			("0" + (d.getMonth() + 1)).substr(-2),
			("0" + d.getDate()).substr(-2)
		].join('-')+' '+
		[
			("0" + d.getHours()).substr(-2),
			("0" + d.getMinutes()).substr(-2),
			("0" + d.getSeconds()).substr(-2)
		].join(':');
	}
}

$(function(){
	
	var startX, startY, endX, endY, pull;
	
	$(document)
		/*
		.on('swiperight','.view:not(.disable)',function(){
			$(this).find('.menu').trigger('tap');
		})
		.on('swipeleft','.view.disable',function(){
			$(this).find('.menu').trigger('tap');
		})
		*/
		.on('touchstart',function(event){
			$('.hover').removeClass('hover');
		})
		.on('tap','#nav a',function(){
			var $this = $(this).addClass('hover');
			$('.view.current').find(".header, .section").transition({ opacity:1 }, 1000);
			$('.footer').transition({ y:0 }, 300);
			mobserv.nav.link($this);
			$('.view.current').transition({ x:0 }, 300,function(){
				$('#nav').removeClass('active');
				$('.view.disable').removeClass('disable');
			});
		})
		.on('tap','.view:not(.disable) section a, .view:not(.disable) section .link, .view:not(.disable) header .link, footer .link',function(){
			var $this = $(this).addClass('hover');
			mobserv.nav.link($this);
		})
		.on('tap','.view:not(.disable) .menu',function(){
			var $this = $(this).addClass('hover');
			if (!$('#nav').hasClass('active')){
				$('.footer').transition({ y:'+=50px' }, 300);
				$('#nav').addClass('active');
				$('.view.current').addClass('disable').transition({ x:'80%' }, 300).find(".header, .section").transition({ opacity:.3 }, 300);
			}
		})
		.on('tap','.view.disable',function(){
			if ($('#nav').hasClass('active')){
				$('.footer').transition({ y:'-=50px' }, 300);
				$('.view.current').transition({ x:0 }, 300,function(){
					$('.view.disable').removeClass('disable');
					$('#nav').removeClass('active');
				}).find(".header, .section").transition({ opacity:1 }, 300);
			}
		})
		.on('touchstart','.view.current .section',function(event){
			startX = event.originalEvent.touches[0].pageX;
			startY = event.originalEvent.touches[0].pageY;
			var $section = $(this);
			var $puller = $section.children('.puller:not(.courtain)');
			var height;
			if ($puller.length){
				height = $puller.height()
				$puller.data('height',height);
				if (height == 0){
					$puller.find('strong').text('Solte para atualizar');	
				}
			}
		})
		.on('touchmove','.view.current .section',function(event){
			endX = event.originalEvent.touches[0].pageX;
			endY = event.originalEvent.touches[0].pageY;
			var $section = $(this);
			var $puller = $section.children('.puller:not(.courtain)');
			if ($puller.length > 0 && $section.scrollTop() == 0 && endY > startY){
				var val = (endY-startY+$puller.data('height'))/2;
				$puller.show().height(val).find('strong').css('opacity',val/($(window).height()/4));
				pull = $puller;
			} else {
				pull = null;	
			}
		})
		.on('touchend','.view.current .section',function(event){
			if (pull){
				var p = pull;
				if (startY+($(window).height()/3) > endY){
					p.transition({ height:0 }, 200);
				} else {
					p.transition({ height:40 }, 200,function(){
						p.addClass('courtain');
						p.find('strong').text('Atualizando...');
						p.parent().trigger('pull');
						startX = null;
						startY = null;
						endX = null;
						endY = null;
					});
					setTimeout(function(){
						p.removeClass('courtain');
						p.transition({ height:0 }, 200);
						pull = null;
					},2000);
				}
			}
		})
		
		.on('show','.view',function(){
			var $this = $(this);
			if (mobserv.history.length == 0){
				$this.find('.header .back').hide();
			} else {
				$this.find('.header .back').show();
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
	window.addEventListener("error", function(error, url, line){
		mobserv.log({
			type : 'error',
			name : 'JS',
			title : 'javascript error',
			message : error+' ('+line+')',
		});	
	}, false);
	document.addEventListener("offline", function(){
		$('.statustripe').addClass('red').fadeIn();
		$('button, submit, reset').addClass('disable').prop('disabled',true);
	}, false);
	document.addEventListener("online", function(){
		$('.statustripe').addClass('blue').fadeOut();
		$('button, submit, reset').removeClass('disable').prop('disabled',false);
	}, false);
	document.addEventListener("deviceready", mobserv.device.onready, false);
	
	setTimeout(function(){ // isso precisa ir para o ondeviceready
		$('.footer').transition({ y:0 }, 500);
		mobserv.nav.toView('home');
		mobserv.server.test('license');
	},300);

	
});
