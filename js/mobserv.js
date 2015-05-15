// JavaScript Document

var mobserv = {
	server : {
		pointer : 0,
		list : [
			{
				id : 'srv0',
				type : 'license',
				url : 'http://ws.sourcelab.com.br/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				id : 'srv1',
				type : 'license',
				url : 'http://sourcelab.com.br/webservice/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				id : 'srv2',
				type : 'license',
				url : 'http://slab.ddns.net/metagen4/webservice/mobserv/rest/',
				online : false,	
				status : null,
				lastRequest : null
			},{
				id : 'srv3',
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
		data : function(server){
			$dom = $('#servers');
			$table = $dom.find('#'+server.id);
			if (!$table.length){
				$table = $dom.find('table.template').clone();
				$table.removeClass('template').attr('id',server.id).appendTo("#servers .section");
			}
			$table.find('#srvid').html(server.id);
			$table.find('#srvtype').html(server.type);
			$table.find('#srvurl').html(server.url);
			$table.find('#srvonline').css('color',(server.online)?'#09F':'#F00').html((server.online)?'Sim':'Não');
			$table.find('#srvstatus').html(server.status);
			$table.find('#srvlastrequest').html(server.lastRequest);
		},
		test : function(type){
			if (!mobserv.connection.test()) return;
			var pointer = mobserv.server.pointer;
			var server = mobserv.server.list[pointer];
			if (server){
				mobserv.log({
					name : 'server.test',
					message : 'init test on '+server.url,
				});
				if (type === server.type){
					server.status = 'Conectando';
					var aborttime;
					var xhr = $.ajax({
						type: 'GET', 
						url: server.url, 
						dataType: 'xml', 
						done: function(response,st,xhr){
							console.log('done',server,mobserv.server.pointer);
							if (response !== '' && $(response).find('mobserv').length == 1){
								server.online = true;
								server.status = 'Conectado';
								mobserv.server.online[type] = server;
								mobserv.server.pointer = 0;
								mobserv.log({
									type : 'info',
									name : 'server.test',
									message : server.url+' is now the online '+type+' server',
								});
							} else {
								server.online = false;
								server.status = 'Erro de Parser';
								mobserv.log({
									type : 'error',
									name : 'server.test',
									message : server.url+' response invalid xml',
								});
								mobserv.server.pointer++;
								mobserv.server.test(type);	
							}
						}, 
						fail: function(xhr,st,err){
							console.log('fail',server,mobserv.server.pointer);
							server.online = false;
							server.status = 'Erro de Resposta';
							mobserv.log({
								type : 'error',
								name : 'server.test',
								message : server.url+' response error ('+((err)?err:'unknown')+')',
							});
							mobserv.server.pointer++;
							mobserv.server.test(type);	
						}, 
						always: function(){
							console.log('always',server,mobserv.server.pointer);
							server.lastRequest = mobserv.now();
							mobserv.server.data(server);
							if (mobserv.server.pointer == mobserv.server.list.length){
								mobserv.server.pointer = 0;	
							}
							clearTimeout(aborttime);
						}
					});
					aborttime = setTimeout(function(){
						xhr.abort();
						server.online = false;
						server.status = 'Tempo de resposta esgotado';
						mobserv.log({
							type : 'error',
							name : 'server.test',
							message : server.url+' response timeout)',
						});
					},30000);
				} else {
					console.log('not '+type,server,mobserv.server.pointer);
					mobserv.server.pointer++;
					mobserv.server.test(type);	
				}
			}
		},
		loopcall : function(type,data,ondone,onerror){
			mobserv.server.test(type);
			var server;
			var limit = 30;
			var interval = setInterval(function(){
				server = mobserv.server.online[type];
				if (server){
					mobserv.server.call(type,data,ondone,onerror,true);
					clearInterval(interval);
				}
				if (limit === 0){
					mobserv.log({
						type : 'error',
						name : 'server.loopcall',
						message : 'no '+type+' servers available',
					});
					if(onerror) onerror('Os servidores de '+((server.type == 'license')?'validação de licença':'serviço do cliente')+' não responderam');
					clearInterval(interval);
				}
				limit--;
			},1000);
		},
		call : function(type,data,ondone,onerror,loop){
			var server = mobserv.server.online[type];
			if ((!server || !server.online) && !loop){
				mobserv.log({
					type : 'alert',
					name : 'server.call',
					message : 'default '+type+' server is offline',
				});
				mobserv.server.loopcall(type,data,ondone,onerror);
				return false;
			}
			server.status = 'Conectando';
			$.ajax({
				type: 'GET', 
				url: server.url, 
				dataType: 'xml',
				data: data,
				done: function(response,st,xhr){
					if (response !== '' && $(response).find('mobserv').length == 1){
						server.online = true;
						server.status = 'Conectado';
						server.lastRequest = mobserv.now();
						mobserv.server.online[type] = server;
						mobserv.log({
							type : 'info',
							name : 'server.call',
							message : 'default online '+type+' server call done',
						});
						if(ondone) ondone(response,st,xhr);
					} else {
						server.online = false;
						server.status = 'Erro de Parser';
						server.lastRequest = mobserv.now();
						mobserv.log({
							type : 'error',
							name : 'server.call',
							message : server.url+' response invalid xml',
						});
						mobserv.server.loopcall(type,data,ondone,onerror);
					}
				},
				fail: function(xhr,st,err){
					server.online = false;
					server.status = 'Erro de Conexão';
					mobserv.log({
						type : 'error',
						name : 'server.call',
						message : server.url+' response error ('+((err)?err:'unknown')+')',
					});
					mobserv.server.loopcall(type,data,ondone,onerror);
				}, 
				always: function(){
					server.lastRequest = mobserv.now();
					mobserv.server.data(server);
				}
			});
		}
	},
	device : {
		data : {},
		onready : function(){
			mobserv.device.data = device;
			var $dom = $("#deviceinfo");
			if ($dom.length){
				if (typeof device == 'object'){
					if (device.platform == 'iOS') $('.view').addClass('ios');
					$dom.find('#cordova').html(device.cordova); 		
					$dom.find('#model').html(device.model); 		
					$dom.find('#platform').html(device.platform); 		
					$dom.find('#uuid').html(device.uuid); 
					$dom.find('#version').html(device.version); 
					mobserv.log({
						name : 'device.onready',
						message : 'device is ready',
					});	
				} else {
					mobserv.log({
						type : 'error',
						name : 'device.onready',
						message : 'device property not available',
					});	
				}
			}
			mobserv.server.test('license');
			mobserv.bgmode.init();
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
	sqlite : {
		db : null,
		init : function(){
			var db = mobserv.sqlite.db = window.sqlitePlugin.openDatabase({name: "mobserv.db",  androidLockWorkaround: 1, location: 2});
			db.transaction(
				function(tx){
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS clients ('+
							'id integer primary key, '+
							'code text, '+
							'file text, '+
							'default integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS services ('+
							'id integer primary key, '+
							'date text, '+
							'client integer, '+
							'file text, '+
							'default integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS messages ('+
							'id integer primary key, '+
							'client integer, '+
							'file text '+
						')'
					);
					mobserv.log({
						name : 'sqlite.open',
						message : 'db mobserv.db is idle',
					});	
				},
				function(e) {
					mobserv.log({
						type : 'error',
						name : 'sqlite.init',
						message : 'transaction error: '+e.message,
					});	
				}
			);
		},
		drop : function(){
			window.sqlitePlugin.deleteDatabase({name: "mobserv.db", location: 2},
				function(){
					mobserv.log({
						name : 'sqlite.drop',
						message : 'mobserv.db droped',
					});	
				},
				function(e){
					mobserv.log({
						type : 'error',
						name : 'sqlite.drop',
						message : 'mobserv.db was not droped: '+e.message,
					});	
				}
			);	
		},
		query : function(query,callback){
			var db = mobserv.sqlite.db;
			if (db && query){
				db.transaction(function(tx) {
					tx.executeSql(query, [],
						function(tx, res){
							if (callback) callback(res);
							mobserv.log({
								name : 'sqlite.query',
								message : 'query executed: '+query,
							});	
						}, 
						function(){
							mobserv.log({
								type : 'error',
								name : 'sqlite.query',
								message : 'query error: '+e.message,
							});	
						} 
					);
				});
			}
		}
	},
	bgmode : {
		init : function(){
			cordova.plugins.backgroundMode.enable();
			cordova.plugins.backgroundMode.onactivate = function () {
				setTimeout(function () {
					// Modify the currently displayed notification
					cordova.plugins.backgroundMode.configure({
						text:'Running in background for more than 5s now.'
					});
				}, 5000);
			}				
		}
	},
	zindex : 3,
	preventTap : false,
	timeoutTap : null,
	history : [],
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
				$view.css({x:'30%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ x:0, opacity:1 }, 300, function(){
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
					$current.transition({ x:'30%', opacity:0 }, 300, function(){
						$current.hide().removeClass('current');
					});
					$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 500, function(){
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
	notify : function(notify){
		var $notify = $('#notify');
		$notify.find('strong').text((notify.name)?notify.name:'sdsda');
		$notify.find('span').text((notify.message)?notify.message:'');
		$notify.removeClass('error alert info notice').addClass((notify.type)?notify.type:'').css({bottom:'-50%', opacity:0}).show().transition({ bottom:0, opacity:1 }, 400, function(){
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
		console.log(obj);
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
		.on('tap','#formclient .submit',function(){
			var data = {
				'exec': 'getLicense',
				'in': mobserv.device.data.uuid
			};
			var valid = true;
			var $submit = $(this);
			var $form = $submit.closest('form');
			data.cid = $form.find('#cid').val();
			data.pw = $form.find('#pw').val();
			data.pw = (data.pw?$.md5(data.pw):null);
			if (!data.cid || !data.pw){
				valid = false;	
			}
			if (valid){
				$form.find('.input, .submit').addClass('disable').prop('disabled',true);
				mobserv.server.call('license',data,function(response){
					var $response = $(response);
					var $valid = $response.find('validation:eq(0)');
					if ($valid.length){
						var status = $valid.attr('status');
						mobserv.log({
							type : status,
							name : 'client.validation',
							message : status+' validation: '+$valid.text(),
						});
						if (status == 'info'){
							mobserv.nav.toView('home');
						} else {
							mobserv.notify({
								type : status,
								name : 'Validação de Cliente',
								message : $valid.text()
							});	
							$form.find('.input, submit').removeClass('disable').prop('disabled',false);
						}
						
					}
				},
				function(){
				
				});
			} else {
				mobserv.notify({
					type : 'error',
					message : 'Os campos são requiridos'
				});	
			}
		})
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
				$('.view.current').addClass('disable').transition({ x:'80%' }, 300).find(".header, .section").transition({ opacity:.3 }, 400);
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
			if ($puller.length > 0 && $section.scrollTop() < 5 && endY > startY){
				$section.scrollTop(0).addClass('noscroll');
				var val = (endY-startY+$puller.data('height'))/2.3;
				$puller.show().height(val).find('strong').css('opacity',val/($(window).height()/4));
				pull = $puller;
			} else {
				pull = null;	
			}
		})
		.on('touchend','.view.current .section',function(event){
			var $section = $(this);
			if (pull){
				var p = pull;
				$section.removeClass('noscroll').scrollTop(0);
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
		$('.statustripe').removeClass('red').fadeOut();
		$('button, submit, reset').removeClass('disable').prop('disabled',false);
	}, false);
	document.addEventListener("deviceready", mobserv.device.onready, false);
	
	setTimeout(function(){ // isso precisa ir para o ondeviceready
		//$('.footer').transition({ y:0 }, 500);
		mobserv.nav.toView('formclient');
	},300);

	
});
