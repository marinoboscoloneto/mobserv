// JavaScript Document
function htmldecode(str){
	return $('<div/>').html(str).text();
}
var mobserv = {
	inputfocus : null,
	globals : {
		client : {},
		user : {},
		services : {},
		talkies : {},
		translate : {
			license : 'Servidor de Licenças',
			service : 'Servidor de Serviços'	
		}
	},
	debug : {
		active : false,
		on : function(){
			$('#main').addClass('debug');
			mobserv.debug.active = true;
			mobserv.notify.open({
				name : 'Debug',
				message : 'O modo debug está LIGADO.'
			});	
		},
		off : function(){
			$('#main').removeClass('debug');
			mobserv.debug.active = false;
			mobserv.notify.open({
				name : 'Debug',
				message : 'O modo debug está DESLIGADO.'
			});	
		}
	},
	server : {
		timeout : 120000,
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
			}
		],
		queue : {},
		online : {
			license : false,
			service : false
		},
		data : function(server){
			$dom = $('#servers');
			$table = $dom.find('#'+server.id);
			if (!$table.length){
				$table = $dom.find('.template').clone();
				$table.removeClass('template').attr('id',server.id).appendTo("#servers .section");
			}
			$table.find('#srvid').html(server.id);
			$table.find('#srvtype').html(server.type);
			$table.find('#srvurl').html(server.url);
			$table.find('#srvintval').html(server.interval);
			$table.find('#srvonline').css('color',(server.online)?'#09F':'#F00').html((server.online)?'Sim':'Não');
			$table.find('#srvstatus').html(server.status);
			$table.find('#srvlastrequest').html(server.lastRequest);
			$dom.find('.bigicon').css('color',(server.online)?'#09F':'#F00');
		},
		test : function(type){
			var pointer = mobserv.server.pointer;
			var server = mobserv.server.list[pointer];
			if (server){
				mobserv.log({
					name : 'server.test',
					message : 'init test on '+type+' server '+server.url
				});
				if (type === server.type){
					server.status = 'Conectando';
					var cfg = {
						xhrobj : null,
						aborttime : null,
						message : 'Testando '+mobserv.globals.translate[type]+'...',
						cache: false,
						type: 'GET', 
						url: server.url, 
						dataType: 'xml', 
						success: function(response,st,xhr){
							if (response !== '' && $(response).find('mobserv').length == 1){
								server.online = true;
								server.status = 'Conectado';
								mobserv.server.online[type] = server;
								mobserv.server.pointer = 0;
								mobserv.log({
									type : 'notice',
									name : 'server.test',
									message : server.url+' is now the online '+type+' server'
								});
							} else {
								server.online = false;
								server.status = 'Erro de Parser';
								mobserv.log({
									type : 'error',
									name : 'server.test',
									message : server.url+' response invalid xml'
								});
								mobserv.server.pointer++;
								mobserv.server.test(type);
								$('#preload .loadinfo').text('Algo deu errado :(');	
							}
						}, 
						error: function(xhr,st,err){
							server.online = false;
							server.status = 'Erro de Resposta';
							mobserv.log({
								type : 'error',
								name : 'server.test',
								message : server.url+' response error ('+((err)?err:'unknown')+')'
							});
							$('#preload .loadinfo').text('Impossível conectar ao servidor :(');	
							mobserv.server.pointer++;
							mobserv.server.test(type);	
						}, 
						complete: function(){
							server.lastRequest = mobserv.now();
							mobserv.server.data(server);
							if (mobserv.server.pointer == mobserv.server.list.length){
								mobserv.server.pointer = 0;	
							}
							if (cfg.queued){
								delete mobserv.server.queue[cfg.id];
								$.each(mobserv.server.queue||[],function(c,cfg){
									mobserv.server.ajax(cfg);
									return false;	
								})
							}
							clearTimeout(cfg.aborttime);
						},
						timeout : function(){
							cfg.aborttime = setTimeout(function(){
								cfg.xhrobj.abort();
								server.online = false;
								server.status = 'Tempo de resposta esgotado';
								mobserv.log({
									type : 'error',
									name : 'server.test',
									message : server.url+' response timeout)'
								});
								$('#preload .loadinfo').text('O servidor não responde :(');	
							},mobserv.server.timeout/2);
						}
					};
					cfg.xhrobj = mobserv.server.ajax(cfg);
				} else {
					mobserv.server.pointer++;
					mobserv.server.test(type);	
				}
			}
		},
		loopcall : function(type,data,ondone,onerror){
			mobserv.server.test(type);
			var server;
			var limit = (mobserv.server.timeout*2)/1000;
			var interval = setInterval(function(){
				server = mobserv.server.online[type];
				if (server){
					mobserv.server.call(type,data,ondone,onerror,true);
					clearInterval(interval);
				}
				if (mobserv.connection.test()){
					if (limit === 0){
						mobserv.log({
							type : 'error',
							name : 'server.loopcall',
							message : 'no '+type+' servers available'
						});
						if(onerror) onerror('Os servidores de '+((server.type == 'license')?'validação de licença':'serviço do cliente')+' não responderam');
						clearInterval(interval);
					}
				} else {
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
					message : server.url
				});
				mobserv.server.loopcall(type,data,ondone,onerror);
				return false;
			}
			mobserv.log({
				name : 'server.call',
				message : 'default '+type+' server request called',
				detail : 'default '+type+' server request called'
			});
			server.status = 'Conectando';
			var cfg = {
				xhrobj : null,
				aborttime : null,
				message : 'Conectando ao '+mobserv.globals.translate[type]+'...',
				type: (data.isPost)?'POST':'GET',
				url: server.url, 
				dataType: 'xml',
				data: data,
				xhr: function() {
					var xhr = new window.XMLHttpRequest();
					var timeini = mobserv.now('timestamp'), timefin, timediff, bytesloaded, bytestotal;
					xhr.addEventListener("progress", function (event) {
						if (event.lengthComputable) {
							timefin =  mobserv.now('timestamp');
							timediff = timefin - timeini;
							mobserv.connection.speed = (mobserv.connection.speed + ((event.loaded/timediff) * 1024)) / 2;
							mobserv.connection.traffic += event.loaded / 1204;
							mobserv.connection.parsedom();
						}					
					}, false);
					return xhr;
				},				
				success: function(response,st,xhr){
					if (response !== '' && $(response).find('mobserv').length == 1){
						server.online = true;
						server.status = 'Conectado';
						server.lastRequest = mobserv.now();
						mobserv.server.online[type] = server;
						mobserv.log({
							type : 'info',
							name : 'server.call',
							message : 'default '+type+' server request complete',
							detail : (data)?decodeURIComponent($.param(data)).replace(/\&/g,"<br>"):''
						});
						//$('#preload .loadinfo').text('Concluído');	
						if(ondone) ondone(response,st,xhr);
					} else {
						server.online = false;
						server.status = 'Erro de Parser';
						server.lastRequest = mobserv.now();
						mobserv.log({
							type : 'error',
							name : 'server.call',
							message : 'default '+type+' server response invalid xml',
							detail : (data)?decodeURIComponent($.param(data)).replace(/\&/g,"<br>"):''
						});
						$('#preload .loadinfo').text('Algo deu errado :(');	
						mobserv.server.loopcall(type,data,ondone,onerror);
					}
				},
				error: function(xhr,st,err){
					server.online = false;
					server.status = 'Erro de Conexão';
					mobserv.log({
						type : 'error',
						name : 'server.call',
						message : 'default '+type+' server response error ('+((err)?err:'unknown')+')',
						detail : (data)?decodeURIComponent($.param(data)).replace(/\&/g,"<br>"):''
					});
					$('#preload .loadinfo').text('Impossível conectar ao servidor :(');
					mobserv.server.loopcall(type,data,ondone,onerror);
				}, 
				complete: function(){
					server.lastRequest = mobserv.now();
					mobserv.server.data(server);
					//$('#preload').removeClass('courtain');
					//$('#preload .loadinfo').text('Concluído.');
					if (cfg.queued){
						delete mobserv.server.queue[cfg.id];
						$.each(mobserv.server.queue||[],function(c,cfg){
							mobserv.server.ajax(cfg);
							return false;	
						})
					}
					clearTimeout(cfg.aborttime);
				},
				timeout : function(){
					cfg.aborttime = setTimeout(function(){
						cfg.xhrobj.abort();
						server.online = false;
						server.status = 'Tempo de resposta esgotado';
						mobserv.log({
							type : 'error',
							name : 'server.call',
							message : 'default '+type+' server response timeout)',
							detail : (data)?decodeURIComponent($.param(data)).replace(/\&/g,"<br>"):''
						});
						$('#preload .loadinfo').text('O servidor não responde :(');	
					},mobserv.server.timeout/2);
				}
			};
			cfg.xhrobj = mobserv.server.ajax(cfg);
		},
		ajax : function(cfg){
			cfg.id = $.md5(cfg.url+((cfg.data)?decodeURIComponent($.param(cfg.data)):''));
			if (cfg.data){
				cfg.data.device = {
					model : mobserv.device.data.model,
					platform : mobserv.device.data.platform,
					version : mobserv.device.data.version
				}
				var pos = mobserv.geolocation.position;
				cfg.data.gps = {}
				cfg.data.gps.lat = pos.latitude;
				cfg.data.gps.lon = pos.longitude;
				cfg.data.gps.accuracy = pos.accuracy;
				cfg.data.gps.altitude = pos.altitudeAccuracy;
				cfg.data.gps.head = pos.heading;
				cfg.data.gps.speed = pos.speed;
				cfg.data.gps.timestamp = pos.timestamp;
			} else {
				cfg.data = {};
			}
			if (mobserv.debug.active) cfg.data.debug = 'on'
			if (!mobserv.connection.test()){
				//$('#preload').removeClass('courtain');
				$('#preload .loadinfo').text('Sem internet :(');
				cfg.queued = true;
				mobserv.server.queue[cfg.id] = cfg;
				mobserv.log({
					type : 'alert',
					name : 'server.ajax.queue',
					message : cfg.url+' request pushed to queue',
					detail : (cfg.data)?decodeURIComponent($.param(cfg.data)).replace(/\&/g,"<br>"):''
				});
				mobserv.notify.open({
					type : 'alert',
					name : 'Sem internet',
					message : 'A transação será enviada quando a conexão for reestabelicida'
				});	
			} else {
				$('#preload').addClass('courtain');
				$('#preload .loadinfo').text((cfg.message)?cfg.message:'Conectando...');
				if (cfg.timeout) cfg.timeout();
				var xhr = $.ajax(cfg);
				return xhr;
			}
		}
	},
	device : {
		ready : false,
		data : {},
		init : function(){
			mobserv.globals.client = {};
			mobserv.globals.user = {};
			mobserv.device.ready = true;
			if (typeof cordova.getAppVersion != 'undefined'){
				cordova.getAppVersion().then(function (version) {
					mobserv.device.data.appver = version ? version : '0.0';
					$('.appver').html(mobserv.device.data.appver); 
					$('#appver').html(mobserv.device.data.appver); 
					mobserv.log({
						type : 'notice',
						name : 'device.appver',
						message : 'device application native version: '+mobserv.device.data.appver
					});	
				});
			} else {
				var version = '0.0';
				$.ajax({
					type: 'GET', 
					url: 'config.xml', 
					dataType: 'xml',
					success: function(response,st,xhr){
						version = $(response).find('widget').attr('version');
						mobserv.device.data.appver = version;
						$('.appver').html(mobserv.device.data.appver); 
						$dom.find('#appver').html(mobserv.device.data.appver); 
						mobserv.log({
							type : 'notice',
							name : 'device.appver',
							message : 'device application local xml version: '+mobserv.device.data.appver
						});	
					}
				});
			}
			if (typeof device == 'object'){
				mobserv.device.data = device;
				mobserv.log({
					type : 'notice',
					name : 'device.init',
					message : 'device '+mobserv.device.data.platform+' is ready'
				});	
			} else {
				mobserv.device.data.cordova = false;
				mobserv.device.data.model = ($.browser.mobile)?'Mobile':'Desktop';
				mobserv.device.data.platform = $.browser.platform;
				mobserv.device.data.uuid = $.md5($.browser.name+$.browser.platform+$.browser.version+$.browser.versionNumber);
				mobserv.device.data.version = $.browser.version;
				mobserv.log({
					type : 'alert',
					name : 'device.onready',
					message : 'native device properties not available'
				});	
			}
			if (mobserv.device.data.platform == 'iOS') $('#main').addClass('ios');
			var $dom = $("#about");
			if ($dom.length){
				$dom.find('#cordova').html(mobserv.device.data.cordova); 		
				$dom.find('#model').html(mobserv.device.data.model); 		
				$dom.find('#platform').html(mobserv.device.data.platform); 		
				$dom.find('#uuid').html(mobserv.device.data.uuid); 
				$dom.find('#version').html(mobserv.device.data.version); 
			}
		}
	},
	battery : {
		level : 100,
		plugged : true,
		idle : true,
		parsedom : function(){
			var $dom = $("#battery");
			if (mobserv.battery.level <= 10){
				$dom.find('.bigicon').css('color','#F10');
				$dom.find('#level').css('color','#F10');
			} else if (mobserv.battery.level <= 20){
				$dom.find('.bigicon').css('color','#F70');
				$dom.find('#level').css('color','#F70');
			} else {
				$dom.find('.bigicon').css('color','#09F');
				$dom.find('#level').css('color','#09F');
			}
			$dom.find('#level').html(mobserv.battery.level+'%'); 		
			$dom.find('#plugged').html(mobserv.battery.plugged ? 'Conectado' : 'Não Conectado'); 		
			$dom.find('#idle').html(mobserv.battery.idle ? 'Normal' : 'Avançado'); 		
		},
		init : function(){
			window.addEventListener("batterycritical", function(info){
				mobserv.battery.level = info.level;
				mobserv.battery.plugged = info.isPlugged;
				if (!info.isPlugged){
					mobserv.battery.idle = false;
					mobserv.notify.open({
						type : 'alert',
						name : 'Nível crítico de bateria',
						message : 'Recarregue seu dispositivo para continuar usando o mobserv'
					});	
					mobserv.notification.open({
						title : 'Nível crítico de bateria',
						text : 'Recarregue seu dispositivo para continuar usando o mobserv',
						sound : 'alert.mp3',
						icon : 'ico-notification-error.png'
					});
				} else {
					mobserv.battery.idle = true;
				}
				mobserv.battery.parsedom();
			}, false);
			window.addEventListener("batterylow", function(info){
				mobserv.battery.level = info.level;
				mobserv.battery.plugged = info.isPlugged;
				if (!info.isPlugged){
					mobserv.battery.idle = false;
					mobserv.notify.open({
						type : 'alert',
						name : 'Pouca bateria',
						message : 'Recarregue seu dispositivo para continuar usando o mobserv'
					});	
					mobserv.notification.open({
						title : 'Pouca bateria',
						text : 'Recarregue seu dispositivo para continuar usando o mobserv',
						sound : 'alert.mp3',
						icon : 'ico-notification-alert.png'
					});
				} else {
					mobserv.battery.idle = true;
				}
				mobserv.battery.parsedom();
			}, false);
			window.addEventListener("batterystatus", function(info){
				mobserv.battery.level = info.level;
				mobserv.battery.plugged = info.isPlugged;
				mobserv.battery.idle = true;
				mobserv.battery.parsedom();
			}, false);
			mobserv.log({
				type : 'notice',
				name : 'battery.init',
				message : 'battery api is loaded'
			});	
			mobserv.battery.parsedom();
		}
	},
	keyboard : {
		visible : false,
		init : function(){
			window.addEventListener('native.keyboardshow', function(event){
				var disableScroll, documentScroll, sectionScroll, hideKeyboardAccessoryBar;
				var $main = $('#main');
				if(mobserv.inputfocus && mobserv.inputfocus.data('disablescroll')){
					cordova.plugins.Keyboard.disableScroll(true);
					$main.css({height: ($(window).height() - event.keyboardHeight) + 'px', top:'auto', bottom:'0px'});
					disableScroll = true;
				} else {
					cordova.plugins.Keyboard.disableScroll(false);
					$main.css({height: '100%', top:'0px', bottom:'auto'});
					disableScroll = false;
				}
				if(mobserv.inputfocus && mobserv.inputfocus.data('documentscroll')){
					documentScroll = mobserv.inputfocus.data('documentscroll');
					$(window).scrollTop(documentScroll == 'true' ? 0 : documentScroll);
					$(document).scrollTop(documentScroll);
				}
				if(mobserv.inputfocus && mobserv.inputfocus.data('sectionscroll')){
					var $view = $main.find('.view.current:eq(0)');
					sectionScroll = mobserv.inputfocus.data('sectionscroll');
					$view.find('.section').scrollTop(sectionScroll);
				}
				if(mobserv.inputfocus && mobserv.inputfocus.data('hideaccessory')){
					cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
					hideKeyboardAccessoryBar = true;
				} else {
					cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
					hideKeyboardAccessoryBar = false;
				}
				mobserv.log({
					name : 'native.keyboardshow',
					message : 'keyboard has shown',
					detail : 'documentScroll: '+documentScroll+', sectionScroll: '+sectionScroll+', disableScroll: '+((disableScroll)?'true':'false')+', hideKeyboardAccessoryBar: '+((hideKeyboardAccessoryBar)?'true':'false')+', keyboardHeight: '+event.keyboardHeight+', $main.height: '+$main.height()
				});
				mobserv.keyboard.visible = true;
			});
			window.addEventListener('native.keyboardhide', function(event){
				var $main = $('#main');
				cordova.plugins.Keyboard.disableScroll(false);
				$main.css({height: '100%'});
				mobserv.log({
					name : 'native.keyboardhide',
					message : 'keyboard has hidden'
				});	
				mobserv.keyboard.visible = false;
			});
			mobserv.log({
				type : 'notice',
				name : 'keyboard.init',
				message : 'keyboard api is loaded'
			});	
		},
		close  : function(){
			if (cordova && cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.isVisible){
				cordova.plugins.Keyboard.close();
			}
		}
	},
	menubutton : {
		init : function(){
			document.addEventListener("menubutton", function(event){
				event.preventDefault();
				$('.view.current:not(.disable) .menu').trigger('tap');
			}, false);
		}
	},
	backbutton : {
		init : function(){
			document.addEventListener("backbutton", function(event){
				event.preventDefault();
				if (mobserv.history.length > 0)	$(".view.current .back, .view.current .close").trigger("tap");
				else mobserv.nav.foreground('confirmexit');
			}, false);
		}
	},
	insomnia : {
		init : function(){
			if (window.plugins.insomnia && window.plugins.insomnia.keepAwake){
				window.plugins.insomnia.keepAwake(
					function(){
						mobserv.log({
							type : 'notice',
							name : 'insomnia.keepAwake',
							message : 'the device will be awake for a life'
						});
					},
					function(){
						mobserv.log({
							type : 'error',
							name : 'insomnia.keepAwake',
							message : 'the device will sleep anyway'
						});
					}
				);
				mobserv.log({
					type : 'notice',
					name : 'insomnia.init',
					message : 'insomnia api is loaded'
				});	
			}
		}
	},
	bgmode : {
		bgintval : null,
		active : false,
		activate : function(){
			var bgmodeHops = 0;
			mobserv.bgmode.active = true;
			if (mobserv.auth.loggedin()){
				mobserv.services.autogetspeed = 2;
				mobserv.talkies.autogetspeed = 2;
				mobserv.geolocation.autopostionspeed = 2;
				mobserv.services.autoreset();
				mobserv.talkies.autoreset();
				mobserv.geolocation.autoPosition();
			}
			mobserv.log({
				type : 'info',
				name : 'backgroundMode.onactivate',
				message : 'the background mode is active'
			});
			mobserv.bgmode.bgintval = setInterval(function(){
				bgmodeHops++;
				mobserv.log({
					name : 'backgroundMode.onactivate',
					message : 'the background mode is rolling',
					detail : 'hops: '+bgmodeHops+' minutes'
				});
			},60000);
		},
		deactivate : function(){
			mobserv.bgmode.active = false;
			if (mobserv.auth.loggedin()){
				mobserv.services.autogetspeed = 1;
				mobserv.talkies.autogetspeed = 1;
				mobserv.geolocation.autopostionspeed = 1;
				mobserv.services.autoreset();
				mobserv.talkies.autoreset();
				mobserv.geolocation.autoPosition();
			}
			mobserv.log({
				type : 'info',
				name : 'backgroundMode.ondeactivate',
				message : 'the background mode is inactive'
			});
			clearInterval(mobserv.bgmode.bgintval);
			window.plugin.notification.local.cancelAll();
		},
		faulure : function(){
			mobserv.bgmode.active = false;
			mobserv.log({
				type : 'error',
				name : 'backgroundMode.onfailure',
				message : 'the background mode trigger error'
			});
			clearInterval(mobserv.bgmode.bgintval);
		},
		init : function(){
			if (cordova && cordova.plugins && cordova.plugins.backgroundMode){
				cordova.plugins.backgroundMode.setDefaults({
					title: 'O Mobserv está em espera.',
					ticker: 'O Mobserv está em espera.',
					text: 'Você pode receber notificações automáticas.',
					resume: false
				});
				cordova.plugins.backgroundMode.enable();
				cordova.plugins.backgroundMode.onactivate = mobserv.bgmode.activate;
				cordova.plugins.backgroundMode.ondeactivate = mobserv.bgmode.deactivate;
				cordova.plugins.backgroundMode.onfailure  = mobserv.bgmode.failure;
				mobserv.log({
					type : 'notice',
					name : 'bgmode.init',
					message : 'bgmode api is loaded'
				});	
			} else {
				window.addEventListener("focus", mobserv.bgmode.deactivate);
				window.addEventListener("blur", mobserv.bgmode.activate);
				mobserv.log({
					type : 'notice',
					name : 'bgmode.init',
					message : 'bgmode with js window focus/blur is loaded'
				});	
			}
		}
	},
	connection : {
		online : false,
		type : false,
		speed : 0,
		traffic : 0,
		parsedom : function(){
			var $dom = $("#connectioninfo");
			if (navigator.connection){
				$dom.find('#conntype').html(mobserv.connection.type);
				if (navigator.connection.type == Connection.NONE){
					$dom.find('#connstatus').html('Offline').css('color','#F60');
					$dom.find('.bigicon').css('color','#F60');
				} else {
					$dom.find('#connstatus').html('Online').css('color','#09F');
					$dom.find('.bigicon').css('color','#09F');
				}
			} else {
				$dom.find('#connstatus').html('Online (default)').css('color','#09F');
				$dom.find('#conntype').html('Test impossible');	
				$dom.find('.bigicon').css('color','#09F');
			}
			$dom.find('#connspeed').html(mobserv.connection.speed.toFixed(2)+' kbps');
			$dom.find('#conntraffic').html(mobserv.connection.traffic.toFixed(2)+' KB');
		},
		test : function(type){
			if (navigator.connection){
				var networkState = navigator.connection.type;
				var states = {};
				states[Connection.UNKNOWN]  = 'Conexão Desconhecida';
				states[Connection.ETHERNET] = 'Conexão de Rede';
				states[Connection.WIFI]     = 'Conexão WiFi';
				states[Connection.CELL_2G]  = 'Conexão 2G';
				states[Connection.CELL_3G]  = 'Conexão 3G';
				states[Connection.CELL_4G]  = 'Conexão 4G';
				states[Connection.CELL]     = 'Conexão de Dados';
				states[Connection.NONE]     = 'Sem Conexão';
				mobserv.connection.type = states[networkState];
				if (navigator.connection.type == Connection.NONE){
					mobserv.connection.online = false;
					mobserv.log({
						type : 'alert',
						name : 'connection.test',
						message : 'no internet connection'
					});
					mobserv.connection.parsedom();
					return false;
				} else {
					mobserv.connection.online = true;
					mobserv.connection.parsedom();
					return true;
				}
			} else {
				mobserv.connection.online = true;
				mobserv.connection.parsedom();
				return true;
			}
		}
	},
	bing : {
		maps : {},
		pins : {},
		current : null,
		load : function(id,lat,lng,zoom,move){
			if (!mobserv.bing.maps[id]){
				var mapOptions = {
					credentials: "Apdih_ZEtJRQ7b5R0qEtfymz42_Yr-WqTqEfICR5JzeW8uj6Ou_n_M9hxyc6pCHE",
					mapTypeId: Microsoft.Maps.MapTypeId.road,
					enableSearchLogo: false,
					showDashboard: false,
					center: new Microsoft.Maps.Location(lat,lng),
					zoom: zoom || 10
				};
				var map = mobserv.bing.maps[id] = new Microsoft.Maps.Map(document.getElementById(id), mapOptions);
				if (move) Microsoft.Maps.Events.addHandler(map, 'viewchangestart', move);
			}
			mobserv.bing.current = id;
			return mobserv.bing.maps[id];
		},
		center : function(lat,lng){
			if (!mobserv.bing.current) return;
			var id = mobserv.bing.current;
			var map = mobserv.bing.maps[id];
			if (lat && lng) map.setView({ center: new Microsoft.Maps.Location(lat,lng) });
		},
		zoom : function(zoom){
			if (!mobserv.bing.current) return;
			var id = mobserv.bing.current;
			var map = mobserv.bing.maps[id];
			if (zoom) map.setView({ zoom: zoom })	
		},
		pam : function(force){
			mobserv.bing.forcepam = force;
			if (!mobserv.bing.current) return;
			var id = mobserv.bing.current;
			var lat = mobserv.geolocation.position.latitude;
			var lng = mobserv.geolocation.position.longitude;
			mobserv.bing.me(lat,lng);
			if (mobserv.bing.forcepam) mobserv.bing.center(lat,lng);
		},
		me : function(lat,lng,click){
			var lat = lat || mobserv.geolocation.position.latitude;
			var lng = lng || mobserv.geolocation.position.longitude;
			return mobserv.bing.pin.add('_me_',lat,lng,'pic/marker-mobserv.png',click);
		},
		pin : {
			animate : function(id,lat,lng){
				if (!mobserv.bing.pins[id]) return;
				var pin = mobserv.bing.pins[id];
				var numDeltas = 25;
				var delay = 10; //milliseconds
				var i = 0;
				var deltaLat;
				var deltaLng;
				var plat = pin.getLocation().latitude;
				var plng = pin.getLocation().longitude;
				function transition(){
					i = 0;
					deltaLat = (lat - plat)/numDeltas;
					deltaLng = (lng - plng)/numDeltas;
					move();
				}
				function move(){
					plat += deltaLat;
					plng += deltaLng;
					pin.setLocation(new Microsoft.Maps.Location(plat,plng));
					if(i!=numDeltas){
						i++;
						setTimeout(move, delay);
					}
				}
				transition();
			},
			add : function(id,lat,lng,img,click){
				if (!mobserv.bing.current) return;
				var cur = mobserv.bing.current;
				var map = mobserv.bing.maps[cur];
				if (!mobserv.bing.pins[id]){
					var options = {
						icon: img,
						width: 30, 
						height: 30,
						anchor:new Microsoft.Maps.Point(15, 15)
					}; 
					var pin = mobserv.bing.pins[id] = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(lat,lng), options);
					if (click) Microsoft.Maps.Events.addHandler(pin, 'click', click);
					map.entities.push(pin);	
				} else {
					mobserv.bing.pin.animate(id,lat,lng);
				}
				return mobserv.bing.pins[id];
			},
			remove : function(id){
				if (!mobserv.bing.current) return;
				var cur = mobserv.bing.current;
				var map = mobserv.bing.maps[cur];
				for(var i=map.entities.getLength()-1;i>=0;i--) {
					var pin = map.entities.get(i);
					if (pin instanceof Microsoft.Maps.Pushpin){
						if (id && mobserv.bing.pins[id] === pin){
							map.entities.removeAt(i);
							delete mobserv.maps.pins[id]; 	
						} else if (!id && mobserv.bing.pins['_me_'] !== pin) {
							map.entities.removeAt(i);
							$.each(mobserv.bing.pins||[],function(p,pn){
								if (pn === pin) delete mobserv.bing.pins[p];
							})
							
						}
					}
				}
			},
			location : function(id,lat,lng,img,click){
				return mobserv.bing.pin.add(id,lat,lng,img,click);
			}
		}
		
	},
	geolocation : {
		position : {},
		interval : null,
		watchID : null,
		animID : null,
		autopostionspeed : 1,
		/*
		animate : function(map,marker,circle,force){
			var $map = $('.view#map:visible .map');
			var numDeltas = 25;
			var delay = 10; //milliseconds
			var i = 0;
			var deltaLat;
			var deltaLng;
			var deltaAcr;
			var lat = marker.getPosition().lat();
			var lng = marker.getPosition().lng();
			var acr = circle.getRadius();
			//var hed = (map.getHeading()||0);
			function transition(){
				i = 0;
				deltaLat = (mobserv.geolocation.position.latitude - lat)/numDeltas;
				deltaLng = (mobserv.geolocation.position.longitude - lng)/numDeltas;
				deltaAcr = (mobserv.geolocation.position.accuracy - acr)/numDeltas;
				//deltaHed = (mobserv.geolocation.position.heading - hed)/numDeltas;
				if (force){
					map.panTo({lat:mobserv.geolocation.position.latitude,lng:mobserv.geolocation.position.longitude});
				}
				move();
			}
			function move(){
				lat += deltaLat;
				lng += deltaLng;
				acr += deltaAcr;
				//hed += deltaHed;
				var latlng = new google.maps.LatLng(lat,lng);
				marker.setPosition(latlng);
				circle.setCenter(latlng);
				circle.setRadius(acr);
				if(i!=numDeltas){
					i++;
					setTimeout(move, delay);
				}
			}
			transition();
		},
		panMap : function(force){
			var $map = $('.view#map:visible .map');
			if (!$map.length) return;
			var map = $map.gmap3('get');
			if ($map.length){
				var $location = $('.view#map:visible .item.location');
				force = $location.hasClass('hilite')?true:force;
				$map.gmap3({
					get: {
						name:"marker",
						tag: "mydevice",
						callback: function(marker){
							if (marker){
								$map.gmap3({
									get: {
										name:"circle",
										callback: function(circle){
											if (circle){
												mobserv.geolocation.animate(map,marker,circle,force);
											}
										}
									}
								});
							}
						}
					}
				});
			}
		},
		*/
		parsedom : function(pos){
			var direction, h = pos.coords.heading;
			if (h >= 0 && h < 22.5) direction = 'N';
			else if (h < 67.5) 	  	direction = 'NE';
			else if (h < 112.5) 	direction = 'E';
			else if (h < 157.5) 	direction = 'SE';
			else if (h < 202.5) 	direction = 'S';
			else if (h < 247.5) 	direction = 'SW';
			else if (h < 292.5) 	direction = 'W';
			else if (h < 337.5) 	direction = 'NW';
			else if (h < 382.5) 	direction = 'N';
			else direction = '-'
			var speed = (pos.coords.speed) ?  parseInt(pos.coords.speed * 3.6) : 0
			mobserv.geolocation.position.latitude = pos.coords.latitude||0;
			mobserv.geolocation.position.longitude = pos.coords.longitude||0;
			mobserv.geolocation.position.accuracy = pos.coords.accuracy||0;
			mobserv.geolocation.position.altitude = pos.coords.altitude||0;
			mobserv.geolocation.position.altaccuracy = pos.coords.altitudeAccuracy||0;
			mobserv.geolocation.position.heading = parseInt(pos.coords.heading)||0;
			mobserv.geolocation.position.direction = direction;
			mobserv.geolocation.position.speed = speed;
			mobserv.geolocation.position.timestamp = pos.timestamp||0;
			//mobserv.geolocation.panMap();
			mobserv.bing.pam($('.view#map .item.location').hasClass('hilite'));
			var $dom = $('#map');
			$dom.find('#gpslat').html(mobserv.geolocation.position.latitude); 		
			$dom.find('#gpslng').html(mobserv.geolocation.position.longitude); 		
			$dom.find('#gpsacr').html(mobserv.geolocation.position.accuracy); 		
			$dom.find('#gpsalt').html(mobserv.geolocation.position.altitude); 		
			$dom.find('#gpsact').html(mobserv.geolocation.position.altaccuracy); 		
			$dom.find('#gpsdir').html(mobserv.geolocation.position.heading+'&deg; '+mobserv.geolocation.position.direction); 
			$dom.find('#gpsvel').html(mobserv.geolocation.position.speed+' km/h'); 
			$dom.find('#gpsstp').html(mobserv.geolocation.position.timestamp); 
		},
		autoPosition : function(options){
			var milis = (mobserv.battery.idle) ? 60000*mobserv.geolocation.autopostionspeed : 600000;
			options = options||{};
			mobserv.geolocation.getPosition(options);
			if(mobserv.geolocation.interval) clearInterval(mobserv.geolocation.interval);
			mobserv.geolocation.interval = setInterval(function(){
				mobserv.geolocation.getPosition(options);
			}, milis);
			mobserv.log({
				name : 'geolocation.autoPosition',
				message : 'auto scheduled position started for every '+(milis/1000)+' seconds'
			});	
		},
		getPosition : function(options){
			options = options||{};
			navigator.geolocation.getCurrentPosition(function(pos){
				mobserv.geolocation.parsedom(pos);
				mobserv.log({
					type : 'notice',
					name : 'geolocation.getPosition',
					message : 'position has gotten',
					detail : 'lat: '+pos.coords.latitude+', lng: '+pos.coords.longitude
				});	
			}, function(error){
				mobserv.log({
					type : 'alert',
					name : 'geolocation.getPosition',
					code : error.code,
					message : error.message
				});	
				if (error.PERMISSION_DENIED){
					mobserv.notify.open({
						type : 'alert',
						name : 'Geoposição desabilitada',
						message : 'Habilite a permissão para acesso a geoposições pelo Mobserv nas configurações do seu aparelho'
					});	
				}
			}, options);
		},
		watchPosition : function(options){
			mobserv.log({
				type : 'notice',
				name : 'geolocation.watchPosition',
				message : 'watch position started'
			});	
			if(mobserv.geolocation.watchID) return;
			options = options||{};
			mobserv.geolocation.watchID = navigator.geolocation.watchPosition(function(pos){
				clearInterval(mobserv.geolocation.interval);
				mobserv.geolocation.parsedom(pos);
			}, function(error){
				mobserv.log({
					type : 'error',
					name : 'geolocation.watchPosition',
					code : error.code,
					message : error.message
				});	
				if (error.PERMISSION_DENIED){
					mobserv.notify.open({
						type : 'alert',
						name : 'Geoposição desabilitada',
						message : 'Habilite a permissão para acesso a geoposições pelo Mobserv nas configurações do seu aparelho'
					});	
				}
			}, options);
		},
		clearWatch : function(){
			mobserv.log({
				name : 'geolocation.clearWatch',
				message : 'watch position cleared'
			});	
			if (mobserv.geolocation.watchID) navigator.geolocation.clearWatch(mobserv.geolocation.watchID);
			mobserv.geolocation.autoPosition();
		}
	},
	sqlite : {
		db : null,
		plugin : {},
		init : function(){
			mobserv.log({
				name : 'sqlite.init',
				message : 'db mobserv.db initializing'
			});	
			var db;
			if (!window.sqlitePlugin && window.openDatabase){
				db = mobserv.sqlite.db = window.openDatabase("mobserv.db", "1.0", "Mobserv Local Database", 200000);
			} else {
				db = mobserv.sqlite.db = window.sqlitePlugin.openDatabase({name: "mobserv.db",  androidLockWorkaround: 1, location: 2});
			}
			//mobserv.sqlite.clear();
			mobserv.sqlite.create();
		},
		create : function(){
			var db = mobserv.sqlite.db;
			db.transaction(
				function(tx){
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_clients ('+
							'"id" integer primary key, '+
							'"name" text, '+
							'"code" text, '+
							'"password" text, '+
							'"license" text, '+
							'"install" text, '+
							'"active" integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_users ('+
							'"id" integer primary key, '+
							'"code" text, '+
							'"login" text, '+
							'"password" text, '+
							'"session" text, '+
							'"name" text, '+
							'"active" integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_services ('+
							'"id" integer primary key, '+
							'"code" text, '+
							'"login" text, '+
							'"xml" text '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_talkies ('+
							'"id" integer primary key, '+
							'"code" text, '+
							'"login" text, '+
							'"xml" text '+
						')'
					);
					mobserv.log({
						type : 'notice',
						name : 'sqlite.create',
						message : 'tables in mobserv.db are idle'
					});	
				},
				function(e) {
					mobserv.log({
						type : 'error',
						name : 'sqlite.create',
						message : 'transaction error: '+e.message
					});	
				}
			);
		},
		clear : function(){
			var db = mobserv.sqlite.db;
			db.transaction(
				function(tx){
					tx.executeSql('DROP TABLE IF EXISTS sl_clients');
					tx.executeSql('DROP TABLE IF EXISTS sl_users');
					tx.executeSql('DROP TABLE IF EXISTS sl_services');
					tx.executeSql('DROP TABLE IF EXISTS sl_talkies');
					mobserv.log({
						type : 'notice',
						name : 'sqlite.clear',
						message : 'tables in mobserv.db was cleared'
					});
					mobserv.sqlite.create();
					mobserv.notify.open({
						name : 'SQLite',
						message : 'O SQLite foi restaurado'
					});	
				},
				function(e) {
					mobserv.log({
						type : 'error',
						name : 'sqlite.clear',
						message : 'transaction error: '+e.message
					});	
				}
			);
		},
		drop : function(){
			window.sqlitePlugin.deleteDatabase({name: "mobserv.db", location: 2},
				function(){
					mobserv.log({
						type : 'notice',
						name : 'sqlite.drop',
						message : 'mobserv.db droped'
					});	
				},
				function(e){
					mobserv.log({
						type : 'error',
						name : 'sqlite.drop',
						message : 'mobserv.db was not droped: '+e.message
					});	
				}
			);	
		},
		loop : function(query,ondone,onerror){
			var limit = mobserv.server.timeout/100;
			var interval = setInterval(function(){
				var db = mobserv.sqlite.db;
				if (db){
					mobserv.sqlite.query(query,ondone,onerror,true);
					clearInterval(interval);
				}
				if (limit === 0){
					mobserv.log({
						type : 'error',
						name : 'sqlite.loop',
						message : 'no database available'
					});
					if(onerror) onerror('O banco de dados não está disponível');
					clearInterval(interval);
				}
				limit--;
			},100);
		},
		query : function(query,ondone,onerror,loop){
			var db = mobserv.sqlite.db;
			var interval;
			var statement = (typeof query == 'object')? query.statement : [];
			query = (typeof query == 'object')? query.query : query;
			if (!db && !loop){
				mobserv.log({
					type : 'alert',
					name : 'sqlite.query',
					message : 'databse is stoped'
				});
				mobserv.sqlite.loop(query,ondone,onerror);	
				return false;
			}
			if (db && query){
				db.transaction(function(tx) {
					tx.executeSql(query, statement,
						function(tx, res){
							if (ondone) ondone(res);
							mobserv.log({
								type : 'info',
								name : 'sqlite.query',
								message : 'query executed: '+query,
								detail : 'rows: '+res.rows.length+', rowsAffected: '+res.rowsAffected
							});	
						}
					);
				},
				function(e){
					if (onerror) onerror(e.message);
					mobserv.log({
						type : 'error',
						name : 'sqlite.query',
						message : 'query error: '+e.message,
						detail : query
					});	
				});
			}
		}
	},
	auth : {
		loggedin : function(){
			if (mobserv.globals.user.session){
				return true;	
			}
			mobserv.log({
				type : 'alert',
				name : 'auth.loggedin',
				message : 'user is logged off',
			});	
			return false;
		},
		clientdom : function(){
			var client = mobserv.globals.client;
			$('#formuser .client').text(client.name);
			$('#nav .client').text(client.name);
			var $dom = $('#user');
			$dom.find('#code').text(client.code);
			$dom.find('#cname').text(client.name);
			$dom.find('#install').text(client.install);
			$dom.find('#license').text(client.license);
		},
		userdom : function(){
			var user = mobserv.globals.user;
			$('#footer .user strong').text(user.login);
			$('#footer .user small').text(user.name);
			var $dom = $('#user');
			$dom.find('#login').text(user.login);
			$dom.find('#uname').text(user.name);
			$dom.find('#session').text(user.session);
		},
		logout : function(what){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			if(user.login && (what == 'client' || what == 'user' || !what)){
				var $form = $('#formuser');
				mobserv.sqlite.query(
					'update sl_users set active = 0, session = "" where login = "'+user.login+'"',
					function(res){
						mobserv.globals.user = {};
						mobserv.log({
							type : 'notice',
							name : 'auth.logout.user',
							message : 'user was loged out'
						});	
					}
				);
			}
			if(client.code && (what == 'client' || !what)){
				var $form = $('#formclient');
				mobserv.sqlite.query(
					'update sl_clients set active = 0 where code = "'+client.code+'"',
					function(res){
						mobserv.globals.client = {};
						mobserv.log({
							type : 'info',
							name : 'auth.logout.client',
							message : 'client was loged out'
						});	
					}
				);
				$.each(mobserv.server.list||[],function(s,server){
					if (server.type == 'service') delete server;
				});
			}
			if(mobserv.services.autogettimeout) clearTimeout(mobserv.services.autogettimeout);
			if(mobserv.talkies.autogettimeout) clearTimeout(mobserv.talkies.autogettimeout);
			//if(mobserv.geolocation.interval) clearInterval(mobserv.geolocation.interval);
			if(mobserv.geolocation.watchID) navigator.geolocation.clearWatch(mobserv.geolocation.watchID);
		},
		client : function(res,data,ondone,onerror) {
			var client = mobserv.globals.client;
			mobserv.server.call('license',data,function(response){
				client.response = response;
				var $response = $(response);
				var $valid = $response.find('validation:eq(0)');
				if ($valid.length){
					var status = $valid.attr('status');
					mobserv.log({
						type : status,
						name : 'auth.client',
						message : status+' validation: '+$valid.text()
					});
					if (status == 'info' || status == 'notice'){
						var $lic = $response.find('license:eq(0)');
						client.name = $lic.attr('client');
						client.code = $lic.attr('cid');
						client.license = $lic.attr('number');
						client.install = $lic.attr('install');
						client.active = 1;
						if (res.rows.length == 0){
							mobserv.sqlite.query(
								'insert into sl_clients ('+
									'name, '+
									'code, '+
									'password, '+
									'license, '+
									'install, '+
									'active'+
								') values ('+
									'"'+client.name+'", '+
									'"'+client.code+'", '+
									'"'+client.password+'", '+
									'"'+client.license+'", '+
									'"'+client.install+'", '+
									''+client.active+''+
								')',
								function(res){
									client.id = res.insertId;	
								}
							);	
						} else {
							mobserv.sqlite.query(
								'update sl_clients set '+
									'name = "'+client.name+'", '+
									'code = "'+client.code+'", '+
									'password = "'+client.password+'", '+
									'license = "'+client.license+'", '+
									'install = "'+client.install+'", '+
									'active = '+client.active+' '+
								'where code = "'+client.code+'"'
							);
						}
						var $server = $response.find('server');
						if ($server.length > 0){
							$server.each(function(){
								var $srv = $(this);
								var name = $srv.attr('name');
								var icon = $srv.attr('icon');
								var url = $srv.attr('url');
								var sinterval = $srv.attr('interval');
								if (url){
									if (icon) $('.service-icon').switchClass('icon-package5',icon);
									if (name){
										client.servertitle = name;
										$('.service-name').text(name);
									} else {
										client.servertitle = 'Serviços';
									}
									mobserv.server.list.push({
										id : 'srv'+mobserv.server.list.length,
										type : 'service',
										url : url,
										online : false,	
										status : null,
										lastRequest : null,
										interval : parseInt((sinterval)?sinterval:300)
									});
									mobserv.log({
										type : 'notice',
										name : 'auth.client.serviceserver',
										message : 'added service server: '+url
									});
								} else {
									mobserv.log({
										type : 'error',
										name : 'auth.client',
										message : 'client do not have a service server url'
									});
									mobserv.notify.open({
										type : 'error',
										name : 'Validação do Cliente',
										message : 'O cliente não possui um endereço de servidor de serviços'
									});	
								}
							});	
						} else {
							mobserv.log({
								type : 'error',
								name : 'auth.client',
								message : 'client do not have a service server'
							});
							mobserv.notify.open({
								type : 'error',
								name : 'Validação do Cliente',
								message : 'O cliente não possui um servidor de serviços'
							});	
						}
						mobserv.auth.clientdom();
						if(ondone) ondone($valid.text());
					} else {
						mobserv.notify.open({
							type : status,
							name : 'Validação de Cliente',
							message : $valid.text()
						});
						if(onerror) onerror(response);
					}
				}
			},
			function(error){
				mobserv.notify.open({
					type : 'error',
					name : 'Erro do Servidor',
					message : error
				});	
				if(onerror) onerror(error);
			});
		},
		user : function(res,data,ondone,onerror) {
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			mobserv.server.call('service',data,function(response){
				user.response = response;
				var $response = $(response);
				var $valid = $response.find('validation:eq(0)');
				if ($valid.length){
					var status = $valid.attr('status');
					mobserv.log({
						type : status,
						name : 'auth.user',
						message : status+' validation: '+$valid.text()
					});
					if (status == 'info' || status == 'notice'){
						var $session = $response.find('session:eq(0)');
						user.code = client.code;
						user.name = $session.attr('name');
						user.login = $session.attr('login');
						user.session = $session.text();
						user.active = 1;
						if (res.rows.length == 0){
							mobserv.sqlite.query(
								'insert into sl_users ('+
									'code, '+
									'name, '+
									'login, '+
									'password, '+
									'session, '+
									'active'+
								') values ('+
									'"'+client.code+'", '+
									'"'+user.name+'", '+
									'"'+user.login+'", '+
									'"'+user.password+'", '+
									'"'+user.session+'", '+
									''+user.active+''+
								')',
								function(res){
									user.id = res.insertId;	
								}
							);	
						} else {
							mobserv.sqlite.query(
								'update sl_users set '+
									'code = "'+user.code+'", '+
									'name = "'+user.name+'", '+
									'password = "'+user.password+'", '+
									'session = "'+user.session+'", '+
									'active = '+user.active+' '+
								'where login = "'+user.login+'"'
							);
						}
						mobserv.auth.userdom();
						if(ondone) ondone($valid.text());
					} else {
						mobserv.notify.open({
							type : 'error',
							name : 'Autenticação de Usuário',
							message : $valid.text()
						});	
						if(onerror) onerror(response);
					}
				}
			},
			function(error){
				mobserv.notify.open({
					type : 'error',
					name : 'Erro do Servidor',
					message : error
				});	
				if(onerror) onerror(error);
			});
		},
		init : function(){
			mobserv.log({
				name : 'auth.init',
				message : 'auth initialized'
			});
			mobserv.sqlite.query(
				'select * from sl_clients where active = 1',
				function(res){
					if (res.rows.length == 0){
						mobserv.nav.toView('formclient');
					} else {
						var client = mobserv.globals.client = res.rows.item(0);
						var data = {
							'exec': 'getLicense',
							'in': client.install,
							'cid': client.code,
							'pw': client.password
						};
						mobserv.auth.client(res,data,function(validation){
							mobserv.sqlite.query(
								'select * from sl_users where code = "'+client.code+'" and active = 1',
								function(res){
									if (res.rows.length == 0){
										mobserv.nav.toView('formuser');
										mobserv.notify.open({
											type : 'info',
											name : 'Validação de Cliente',
											message : validation
										});	
									} else {
										var user = mobserv.globals.user = res.rows.item(0);
										var data = {
											'exec': 'authUser',
											'in': client.install,
											'cid': client.code,
											'us': user.login,
											'pw': user.password
										};
										mobserv.auth.user(res,data,function(){
											$('.footer').transition({ y:0 }, 300);
											mobserv.nav.toView('home');
											mobserv.services.init(function(){
												mobserv.services.get(function(){
													mobserv.talkies.init(function(){
														mobserv.talkies.get();
													});
												});
											});
										},
										function(){
											mobserv.nav.toView('formuser');
										});
									}
								},
								function(error){
									mobserv.nav.toView('formuser');	
									mobserv.notify.open({
										type : 'error',
										name : 'SQLite',
										message : error
									});	
								}
							);
						},
						function(){
							mobserv.nav.toView('formclient');
						});
					}
				},
				function(error){
					mobserv.nav.toView('formclient');	
					mobserv.notify.open({
						type : 'error',
						name : 'SQLite',
						message : error
					});	
				}
			);
		}
	},
	services : {
		autogettimeout : null,
		autogetspeed : 1,
		list : {},
		command : {
			viewBack : function(){
				mobserv.nav.back();
				return 
			},
			userLogout : function(){
				mobserv.nav.toView('formuser');
				return 
			},
			clientLogout : function(){
				mobserv.auth.logout('client');
				mobserv.nav.toView('formclient');
				return 
			},
			append : function($parent,$child,param){
				$parent.append($child);	
				return 
			},
			prepend : function($parent,$child,param){
				$parent.prepend($child);
			},
			after : function($parent,$child,param){
				var $found = $parent.find(param);
				if ($found.length) $parent.find(param).after($child);
				else $parent.append($child);
			},
			before : function($parent,$child,param){
				var $found = $parent.find(param);
				if ($found.length) $parent.find(param).before($child);
				else $parent.prepend($child);
			},
			removeNodes : function(param){
				var client = mobserv.globals.client;
				var user = mobserv.globals.user;
				var services = mobserv.globals.services;
				var str = '';
				var total = 0;
				var $nodes;
				var $xml;
				if (param && services.xml){
					$xml = $(services.xml);
					$nodes = $xml.find(param);
				} else {
					$xml = $(services.xml);
					$nodes = $xml.find('mobserv').children();
				}
				total = $nodes.length;
				if (total > 0) $nodes.remove();
				services.xml = $xml.get(0);
				if(services.xml) str = new XMLSerializer().serializeToString(services.xml);
				var query = 'update sl_services set xml = ? '+((client.code && user.login)?'where code = "'+client.code+'" and login = "'+user.login+'"':'');
				mobserv.sqlite.query(
					{query : query, statement : [str]},
					function(res){
						mobserv.services.parsedom();
						mobserv.log({
							type : 'notice',
							name : 'command.removeNodes',
							message : total+' nodes '+((param)?' "'+param+'"':'')+' were removed'
						});
					}
				);
			}
		},
		init : function(ondone){
			mobserv.log({
				name : 'services.init',
				message : 'services initialized'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			mobserv.sqlite.query(
				'select xml from sl_services where code = "'+client.code+'" and login = "'+user.login+'"',
				function(res){
					if (res.rows.length > 0){
						if (res.rows.item(0).xml){
							services.cache = $.parseXML(res.rows.item(0).xml);
							services.xml = $.parseXML(res.rows.item(0).xml);
							var $xml = $(services.xml);
							services.requestKey = $xml.find('mobserv').attr('resultKey');
							mobserv.log({
								type : 'notice',
								name : 'services.init',
								message : $xml.length+' services dumped from local database'
							});
						} else {
							services.xml = '';
							services.requestKey = '';
						}
						if (ondone) ondone();
					} else {
						mobserv.sqlite.query(
							'insert into sl_services (code, login, xml) values ("'+client.code+'", "'+user.login+'", "")',
							function(res){
								services.xml = '';
								services.requestKey = '';
								if (ondone) ondone();
							}
						);	
					}
				}
			);
		},
		autoreset : function(){
			if(mobserv.services.autogettimeout) clearTimeout(mobserv.services.autogettimeout);
			mobserv.services.autoget();
		},
		autoget : function(){
			var server = mobserv.server.online['service'];
			var milis = (mobserv.battery.idle) ? server.interval*1000*mobserv.services.autogetspeed : 1200000;
			mobserv.log({
				name : 'services.autoget',
				message : 'service autoget scheduled in '+(milis/1000)+' seconds'
			});
			mobserv.services.autogettimeout = setTimeout(function(){
				mobserv.services.get();
			}, milis);
		},
		get : function(ondone){
			mobserv.log({
				name : 'services.get',
				message : 'services get start'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			var data = {
				'exec': 'getServices',
				'cid': client.code,
				'sid': user.session,
				'rk': services.requestKey
			};
			if(mobserv.services.autogettimeout) clearTimeout(mobserv.services.autogettimeout);
			mobserv.server.call('service',data,function(response){
				services.response = response;
				mobserv.services.autoget();
				var $xml = $(response);
				var $root = $xml.find('mobserv');
				if ($root.length == 0){
					mobserv.log({
						type : 'error',
						name : 'services.get',
						message : 'mobserv node not found in service server response'
					});
					return false;
				}
				$root.children('command').each(function(){
					var $this = $(this);
					if (mobserv.services.command[$this.attr('exec')]) mobserv.services.command[$this.attr('exec')]($this.text(),response);
					$this.remove();
				});
				var $valid = $root.find('validation');
				var $services = $root.children('service');
				var $rootmark = $root.children('mark');
				$valid.each(function(){
					var $this = $(this);
					var status = $this.attr('status');
					mobserv.log({
						type : status,
						name : 'services.get',
						message : status+' validation: '+$this.text()
					});
					if (services.requestKey != $root.attr('resultKey')){
						mobserv.notify.open({
							type : status,
							name : client.servertitle,
							message : $this.text(),
							duration : 5000,
							tap : (status == 'info' || status == 'notice') ? function(){ mobserv.nav.forward('services'); } : null
						});
						setTimeout(function(){
							mobserv.notification.open({
								title : client.servertitle,
								text : $this.text(),
								sound : 'beep2.mp3',
								icon : 'ico-notification-info.png',
								badge : mobserv.badge.get()
							},function(){
								mobserv.nav.forward('servicelist');
							});
						},1000);
					}
					$this.remove();
				});
				services.requestKey = $root.attr('resultKey');
				if ($services.length){
					services.xml = response;
					services.updated = true;
					var str = new XMLSerializer().serializeToString(services.xml);
					mobserv.sqlite.query({query : 'update sl_services set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
				} else {
					services.updated = false;	
				}
				mobserv.services.parsedom();
				if (ondone) ondone();
			},
			function(error){
				mobserv.services.autoget();
				mobserv.log({
					type : 'error',
					name : 'services.get',
					message : 'get services error: '+error
				});
				mobserv.notify.open({
					type : 'error',
					name : 'Erro ao sincronizar serviços',
					message : error
				});	
				mobserv.services.parsedom();
				if(onerror) onerror(error);
			});
		},
		post : function(data,ondone){
			mobserv.log({
				name : 'services.post',
				message : 'services post start'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			if (typeof data == 'object'){
				data.cid = client.code;
				data.sid = user.session;
				data.rk = services.requestKey;
				mobserv.server.call('service',data,function(response){
					services.response = response;
					var $xml = $(response);
					var $root = $xml.find('mobserv');
					if ($root.length == 0){
						mobserv.log({
							type : 'error',
							name : 'services.post',
							message : 'mobserv node not found in service server response'
						});
						return false;
					}
					$root.children('command').each(function(){
						var $this = $(this);
						if (mobserv.services.command[$this.attr('exec')]) mobserv.services.command[$this.attr('exec')]($this.text(),response);
						$this.remove();
					});
					var $valid = $root.find('validation');
					var $services = $root.children('service');
					$valid.each(function(){
						var $this = $(this);
						var status = $this.attr('status');
						mobserv.log({
							type : status,
							name : 'services.post',
							message : status+' validation: '+$this.text()
						});
						mobserv.notify.open({
							type : status,
							name : client.servertitle,
							message : $this.text()
						});	
						$this.remove();
					});
					services.requestKey = $root.attr('resultKey');
					if ($services.length){
						services.xml = response;
						services.updated = true;
						var str = new XMLSerializer().serializeToString(services.xml);
						mobserv.sqlite.query({query : 'update sl_services set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
					} else {
						services.updated = false;	
					}
					mobserv.services.parsedom();
					if (ondone) ondone();
				},
				function(error){
					mobserv.log({
						type : 'error',
						name : 'services.post',
						message : 'get services error: '+error
					});
					mobserv.notify.open({
						type : 'error',
						name : 'Erro ao postar serviços',
						message : error
					});	
					mobserv.services.parsedom();
					if(onerror) onerror(error);
				});
			}
		},
		parsedom : function(type,id){
			if (!type){
				var $current = $('.view.current:last');
				if ($current.length){
					if ($current.attr('id') == 'servicelist') {
						type = 'servicelist'; 	
					} else if ($current.attr('id') == 'joblist') {
						type = 'joblist'; 	
						id = $current.data('id'); 	
					} else if ($current.attr('id') == 'jobdetails') {
						type = 'jobdetails'; 	
						id = $current.data('id'); 	
					} else {
						type = 'servicelist';
					}
				} else {
					type = 'servicelist'; 		
				}
			}
			mobserv.log({
				name : 'services.parsedom',
				message : 'parsedom '+type+((id)?' #'+id:'')+' started'
			});
			mobserv.services.cleardom(type);
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			if (!services.xml) return false;
			var $dom = {}
			var $xml = {}
			var $html = '';
			$xml.root = $(services.xml).find('mobserv');
			if (type == 'servicelist'){
				$dom.services = $('#servicelist');
				$dom.list = $dom.services.find('.list').html('');
				$xml.service = $xml.root.find('service');
				$xml.service.each(function(){
					var $s = $(this), $l = {}, $t = {}, $mark;
					$s.children('layout:not([name="content"])').each(function(){ var $this = $(this); $l[$this.attr('name')]=htmldecode($this.text()); });
					$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
					$mark = $s.children('mark');
					$html += ''+
					'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
						'<div class="table link" data-view="joblist" data-direction="forward" data-id="'+$s.attr('id')+'">'+
							'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div><mark class="'+$mark.attr('color')+'">'+$mark.text()+'</mark></div>'+
							'<div>'+
								'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
								$s.children('layout').filter('[name="content"]').each(function(){
									$html += '<p>'+htmldecode($(this).text())+'</p>';
								});
							$html += ''+
							'</div>'+
						'</div>'+
					'</li>';
				});
				$dom.list.html($html);	
			} else if (type == 'joblist' && id){
				$dom.service = $('#service');			
				$dom.jobs = $('#joblist');
				$dom.list = $dom.jobs.find('.list').html('');
				$dom.gmap = $dom.jobs.find('.gmap');
				$xml.service = $(services.xml).find('service[id="'+id+'"]');
				$dom.jobs.find('#screenname').text($xml.service.attr('name'));
				$xml.job = $xml.service.find('job');
				$xml.job.each(function(){
					var $s = $(this), $l = {}, $t = {};
					$s.children('layout').each(function(){ var $this = $(this); $l[$this.attr('name')]=htmldecode($this.text()); });
					$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
					$html += ''+
					'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
						'<div class="table link" data-view="jobdetails" data-direction="forward" data-id="'+$s.attr('id')+'">'+
							'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div></div>'+
							'<div>'+
								'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
								$s.children('layout[name="content"]').each(function(){
									$html += '<p>'+htmldecode($(this).text())+'</p>';
								});
							$html += ''+
							'</div>'+
						'</div>'+
					'</li>';
				});
				if ($xml.service.find('location').length){
					$dom.gmap.show().data('id',id);
				} else {
					$dom.gmap.hide();
				}
				$dom.list.html($html);	
			} else if (type == 'jobdetails' && id){
				var $l = {}, $t = {};
				$dom.detail = $('#jobdetails');
				$dom.list = $dom.detail.find('.list').html('');
				$dom.dets = $dom.detail.find('.dets').html('');
				$dom.items = $dom.detail.find('.items').html('');
				$dom.form = $dom.detail.find('.jobform .parsed').html('');
				$dom.gmap = $dom.detail.find('.gmap');
				$s = $(services.xml).find('job[id="'+id+'"]');
				$xml.service = $s.closest('service');
				$s.children('layout').each(function(){ var $this = $(this); $l[$this.attr('name')]=htmldecode($this.text()); });
				$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
				$html += ''+
				'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
					'<div class="table">'+
						'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div></div>'+
						'<div>'+
							'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
							$s.children('layout[name="content"]').each(function(){
								$html += '<p>'+htmldecode($(this).text())+'</p>';
							});
						$html += ''+
						'</div>'+
					'</div>'+
				'</li>';
				$dom.list.html($html);
				$html = '';
				$s.children('layout[name="detail"]').each(function(){
					var $this = $(this);
					$html += '<tr><td style="width:1%;white-space:nowrap;">'+$this.attr('label')+'</td><td><strong>'+htmldecode($this.text())+'</strong></td></tr>';
				});
				$dom.dets.html($html);
				$html = '';
				var $items = $s.children('item');
				if ($items.length){
					$items.each(function(){
						var $this = $(this);
						if ($this.attr('thumb')){
							var itemimage = '<div class="thumb" style="background-image:url('+$this.attr('thumb')+');"></div>';
						} else if ($this.attr('icon')){
							var itemimage = '<div class="icon icon-'+$this.attr('icon')+'"></div>';
						} else {
							var itemimage = '<div class="abbr">'+(($this.attr('abbr'))?$this.attr('abbr'):'ITEM')+'</div>';	
						}
						$html = $(''+
						'<div class="item">'+
							'<div class="check"></div>'+
							'<div class="image">'+itemimage+'</div>'+
							'<div class="data">'+
								'<h2 style="color:'+$this.attr('color')+'">'+$this.attr('name')+'</h2>'+
								'<p><b>'+$this.attr('type')+'</b></p>'+
								(($this.attr('barcode'))?'<p class="icon-barcode">'+$this.attr('barcode')+'</p>':'')+''+
								'<input type="hidden" class="input hidden" name="'+(($this.attr('field'))?$this.attr('field'):'Job_Item')+'['+$this.attr('id')+']" />'+
							'</div>'+
						'</div>');
						if ($this.attr('barcode') && typeof cordova != 'undefined' && typeof cordova.plugins != 'undefined' && typeof cordova.plugins.barcodeScanner != 'undefined'){
							$html.on('tap',function(){
								var $this = $(this);
								$this.addClass('courtain');
								cordova.plugins.barcodeScanner.scan(
									function(result){
										if(!result.cancelled){
											if(result.text){
												if ($this.attr('barcode') == result.text){
													$this.removeClass('unmatch').addClass('match');
													$this.find('.input').val(result.text);
													mobserv.log({
														type : 'info',
														name : 'item.barcode',
														message : 'item '+result.text+' ('+result.format+','+result.cancelled+') match'
													});
													mobserv.notify.open({
														type : 'info',
														name : 'Scanner',
														message : 'Item '+result.text+' selecionado'
													});	
												} else {
													$this.addClass('unmatch').removeClass('match');
													$this.find('.field').val('');
													mobserv.log({
														type : 'alert',
														name : 'item.barcode',
														message : 'item '+result.text+' ('+result.format+','+result.cancelled+') unmatch'
													});
													mobserv.notify.open({
														type : 'alert',
														name : 'Scanner',
														message : 'Item '+result.text+' não confere'
													});
												}
											}
										}
										$this.removeClass('courtain');
									},
									function(error){
										mobserv.log({
											type : 'error',
											name : 'item.barcode',
											message : 'item '+result.text+' ('+result.type+','+result.cancelled+') has not match'
										});
										mobserv.notify.open({
											type : 'error',
											name : 'Scanner',
											message : 'Item '+result.text+' não confere'
										});
										$this.removeClass('courtain');
									}
								);
							});	
						} else {
							$html.on('tap',function(){
								var $this = $(this);
								if ($this.hasClass('match')){
									$this.removeClass('match');
									$this.find('.input').val('');
								} else {
									$this.addClass('match');
									$this.find('.input').val($this.attr('id'));
								}
							});
						}
						$dom.items.append($html);
						$html = '';
					});
					$dom.items.closest('.block').show();	
				}
				var $form = $s.find('form');
				$form = ($form.length) ? $form : $s.closest('service').children('form[type="'+$s.attr('type')+'"]');
				$form = ($form.length) ? $form : $s.closest('mobserv').children('form[type="'+$s.attr('type')+'"]');
				if ($form.length){
					var $desc = $form.children('description:eq(0)');
					$dom.form.siblings('.formdesc').html(($desc.length)?'<p class="description">'+$desc.text()+'</p>':'<p class="description">Formulário de interação de '+$s.attr('type')+'</p>');
					var $submit = $form.children('submit:eq(0)');
					$dom.form.closest('.jobform').find('.submit').val(($submit.length)?$submit.text():'Enviar Dados');
					if($form.attr('action')) $dom.form.siblings('.input[name="action"]').val($form.attr('action'));
					if($form.attr('exec')) $dom.form.siblings('.input[name="exec"]').val($form.attr('exec'));
					$dom.form.siblings('.input[name="service"]').val($s.closest('service').attr('id'));
					$dom.form.siblings('.input[name="job"]').val($s.attr('id'));
					$form.find('formset').each(function(){
						var $formset = $(this);
						$dom.formset = $('<div class="formset"></div>');
						var $desc = $formset.children('description:eq(0)');
						$dom.formset.append(($desc.length)?'<p>'+$desc.text()+'</p>':'');
						if ($formset.attr('visible') == 'false') $dom.formset.hide();
						if ($formset.attr('chain-field')) $dom.formset.attr('chain-field',$formset.attr('chain-field'));
						if ($formset.attr('chain-value')) $dom.formset.attr('chain-value',$formset.attr('chain-value'));
						$dom.form.append($dom.formset);
						$formset.find('field').each(function(){
							var $field = $(this);
							if ($field.attr('type') == 'select'){
								$dom.field = $('<select name="'+$field.attr('name')+'" class="input select" '+(($field.attr('required') == 'true')?' required':'')+'>');
								$dom.field.append('<option value="" disabled selected>'+$field.attr('label')+'</option>');
								$field.find('option').each(function(){
									var $option = $(this);
									$dom.field.append('<option value="'+$option.attr('value')+'">'+$option.text()+'</option>');
								});
							} else if ($field.attr('type') == 'text' || $field.attr('type') == 'number' || $field.attr('type') == 'email'){
								$dom.field = $('<input type="'+$field.attr('type')+'" class="input '+$field.attr('type')+'" placeholder="'+$field.attr('label')+'" '+(($field.attr('required') == 'true')?' required':'')+' data-documentscroll="true" data-sectionscroll="99999999" data-disablescroll="true" />');	
							}
							if ($formset.attr('disable') == 'true') $dom.field.prop('disabled',true);
							$dom.field.on('change',function(){
								var $this = $(this);
								var $parent = $this.parent();
								var val = $this.val();
								var name = $this.attr('name');
								$parent.nextAll('.formset').hide().find('.input').val('');
								$parent.nextAll('.formset[chain-field="'+name+'"][chain-value="'+val+'"]').fadeIn();
							})
							$dom.formset.append($dom.field);
						});	
						$dom.form.append($dom.formset);
					});
				}				
				$dom.detail.find('#interact').data('id',id);
				if ($s.find('location').length){
					$dom.gmap.show().data('id',id);
				} else {
					$dom.gmap.hide();
				}
			}
			var $markhome = $('#home [data-view="servicelist"] mark');
			var $markfoot = $('#footer [data-view="servicelist"] mark');
			var $rootmark = $xml.root.children('mark');
			var $servmark = ($xml.service.length) ? $xml.service.children('mark') : null;
			if ($rootmark && $rootmark.length){
				$rootmark.each(function(){
					var $this = $(this);
					if ($this.text()){
						if (services.updated || !$markfoot.is(':visible')){
							$markhome.text($this.text()).addClass($this.attr('color')).transition({opacity:1,scale:1.5},400,function(){ $markhome.transition({scale:1},200) }).closest('a').removeClass('unmarked');
							$markfoot.text($this.text()).addClass($this.attr('color')).transition({opacity:1,scale:1.5},400,function(){ $markfoot.transition({scale:1},200) }).parent().addClass('marked');
						} else {
							$markhome.transition({opacity:1,scale:1.5},200,function(){ $markhome.text($this.text()).addClass($this.attr('color')).transition({scale:1},200).closest('a').removeClass('unmarked'); });
							$markfoot.transition({opacity:1,scale:1.5},200,function(){ $markfoot.text($this.text()).addClass($this.attr('color')).transition({scale:1},200).parent().addClass('marked'); });
						}
					} else {
						$markhome.transition({opacity:0,scale:0.01},300,function(){ $markhome.parent().closest('a').removeClass('unmarked'); });
						$markfoot.transition({opacity:0,scale:0.01},300,function(){ $markfoot.parent().parent().removeClass('marked'); });
					}
				});
			} else {
				$markhome.transition({opacity:0,scale:0.01},100);
				$markfoot.transition({opacity:0,scale:0.01},100);
			}
			if ($servmark && $servmark.length){
				$servmark.each(function(){
					var $this = $(this);
					var $s = $this.parent();
					var $markserv = $('#servicelist .link[data-id="'+$s.attr('id')+'"] mark');
					if ($this.text()){
						if (services.updated || !$markserv.is(':visible')){
							$markserv.transition({opacity:0,scale:0.01},100,function(){ $markserv.text($this.text()).addClass($this.attr('color')).transition({opacity:1,scale:1.5},500,function(){ $markserv.transition({scale:1},200) }); });
						} else {
							$markserv.transition({opacity:1,scale:1.5},200,function(){ $markserv.text($this.text()).addClass($this.attr('color')).transition({scale:1},200); });
						}
					} else {
						$markserv.transition({scale:1.5},200,function(){ $markserv.transition({opacity:0,scale:0.01},300); });
					}
				});
			} else {
				var $markserv = $('#servicelist .link mark');
				$markserv.transition({opacity:0,scale:0.01},100);
			}
		},
		cleardom : function(type){
			if (!type || type == 'serviceslist'){
				$('#servicelist .list').html('');
			} else if (type == 'joblist'){
				$('#joblist .list').html('');
			} else if (type == 'jobdetails'){
				$('#jobdetails .list').html('');
				$('#jobdetails .dets').html('');
				$('#jobdetails .items').html('');
				$('#jobdetails .parsed').html('');
			}
		}
	},
	talkies : {
		autogettimeout : null,
		autogetspeed : 1,
		init : function(ondone){
			mobserv.log({
				name : 'talkies.init',
				message : 'talkies initialized'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			var totalinmark = 0;
			mobserv.sqlite.query(
				'select xml from sl_talkies where code = "'+client.code+'" and login = "'+user.login+'"',
				function(res){
					if (res.rows.length > 0){
						if (res.rows.item(0).xml){
							talkies.cache = $.parseXML(res.rows.item(0).xml);
							talkies.xml = $.parseXML(res.rows.item(0).xml);
							var $xml = $(talkies.xml);
							talkies.requestKey = $xml.find('mobserv').attr('resultKey');
							mobserv.log({
								type : 'notice',
								name : 'talkies.init',
								message : $xml.find('talk').length+' talkies dumped from local database'
							});
						} else {
							talkies.xml = '';
							talkies.requestKey = '';
						}
						if (ondone) ondone();
					} else {
						mobserv.sqlite.query(
							'insert into sl_talkies (code, login, xml) values ("'+client.code+'", "'+user.login+'", "")',
							function(res){
								talkies.xml = '';
								talkies.requestKey = '';
								if (ondone) ondone();
							}
						);	
					}
				}
			);
		},
		autoreset : function(){
			if(mobserv.talkies.autogettimeout) clearTimeout(mobserv.talkies.autogettimeout);
			mobserv.talkies.autoget();
		},
		autoget : function(){
			var server = mobserv.server.online['service'];
			var milis = (mobserv.battery.idle) ? server.interval*1000*mobserv.talkies.autogetspeed : 1200000;
			mobserv.log({
				name : 'talkies.autoget',
				message : 'talkies autoget scheduled in '+(milis/1000)+' seconds'
			});
			mobserv.talkies.autogettimeout = setTimeout(function(){
				mobserv.talkies.get();
			}, milis);
		},
		get : function(ondone){
			mobserv.log({
				name : 'talkies.get',
				message : 'talkies get start'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			var data = {
				'exec': 'getTalkies',
				'cid': client.code,
				'sid': user.session
			};
			if(mobserv.talkies.autogettimeout) clearTimeout(mobserv.talkies.autogettimeout);
			mobserv.server.call('service',data,function(response){
				talkies.response = response;
				mobserv.talkies.autoget();
				var $Rxml = $(response);
				var $Rroot = $Rxml.find('mobserv');
				if ($Rroot.length == 0){
					mobserv.log({
						type : 'error',
						name : 'talk.get',
						message : 'mobserv node not found in service server response to talkies'
					});
					return false;
				}
				$Rroot.children('command').each(function(){
					var $this = $(this);
					if (mobserv.talkies.command[$this.attr('exec')]) mobserv.talkies.command[$this.attr('exec')]($this.text(),response);
					$this.remove();
				});
				var $Rtalks = $Rroot.children('talk');
				var $view = mobserv.nav.getCurrentView('messages');
				var $section = ($view.length) ? $view.find('.section') : null;
				if ($Rtalks.length){
					var totalinmark = 0;
					if (talkies.xml){
						var $Lxml = $(talkies.xml);
						var $Lroot = $Lxml.find('mobserv');
						$Rtalks.each(function(){
							var $Rtalk = $(this);
							var tid = $Rtalk.attr('id');
							var $Ltalk = $Lroot.find('talk[id="'+tid+'"]');
							var $Rmsgs = $Rtalk.find('message').attr('new','new');
							if ($Ltalk.length){
								var $Lmsgs = $Ltalk.find('message');
								if ($Lmsgs.length > 50) $Lmsgs.filter(':lt('+($Lmsgs.length - 50)+')').remove();
								if ($Rmsgs.length) $Ltalk.append($Rmsgs);
								$Ltalk.attr('name',$Rtalk.attr('name'));
								$Ltalk.attr('subject',$Rtalk.attr('subject'));
								$Ltalk.attr('lastdate',$Rtalk.attr('lastdate'));
								$Ltalk.attr('readed',$Rtalk.attr('readed'));
								$Ltalk.attr('color',$Rtalk.attr('color'));
							} else {
								$Lroot.append($Rtalk);
								var $Ltalk = $Lroot.find('talk[id="'+tid+'"]');
							}
							var mark = ($view.length && $view.data('id') == tid) ? 0 : $Rmsgs.length + (($Ltalk.attr('mark'))?parseInt($Ltalk.attr('mark')):0);
							$Ltalk.attr('mark',mark+'');
							totalinmark += mark;
							mobserv.talkies.parsedom('talkies',tid);
							if ($view.length && $view.data('id') == tid) {
								if (navigator.vibrate && $Rmsgs.length) navigator.vibrate(100);
								mobserv.talkies.parsedom('messages',tid);
								if (mobserv.inputfocus || $section.hasClass('scrollend')){
									$section.scrollTop(999999999);
								}
							}
							setTimeout(function(){
								if ($Rmsgs.length){
									$Rmsgs.each(function(){
										$this = $(this);
										mobserv.notification.open({
											title : $Rtalk.attr('name'),
											text : $this.attr('sender')+': '+$this.text(),
											sound : 'beep.mp3',
											icon : 'ico-notification-chat.png',
											badge : mobserv.badge.get()
										},function(){
											$('#talkies').find('.list .link[data-id="'+tid+'"]').trigger('tap');
										});
									});
								}
							},1000);
						});
					} else {
						talkies.xml = response;	
						var $Lxml = $(talkies.xml);
						var $Lroot = $Lxml.find('mobserv');
						$Rtalks.each(function(){
							var $Rtalk = $(this);
							var tid = $Rtalk.attr('id');
							var $Ltalk = $Lroot.find('talk[id="'+tid+'"]');
							var $Lmsgs = $Ltalk.find('message').attr('new','new');
							var mark = ($view.length && $view.data('id') == tid) ? 0 : $Lmsgs.length;
							$Ltalk.attr('mark',mark+'');
							totalinmark += mark;
							mobserv.talkies.parsedom('talkies',tid);
							if ($view.length && $view.data('id') == tid) {
								if (navigator.vibrate && $Lmsgs.length) navigator.vibrate(100);
								mobserv.talkies.parsedom('messages',tid); 
								if (mobserv.inputfocus || $section.hasClass('scrollend')){
									$section.scrollTop(999999999);
								}
							} 
							setTimeout(function(){
								if ($Lmsgs.length){
									$Lmsgs.each(function(){
										$this = $(this);
										mobserv.notification.open({
											title : $Rtalk.attr('name'),
											text : $this.attr('sender')+': '+$this.text(),
											sound : 'beep.mp3',
											icon : 'ico-notification-chat.png',
											badge : mobserv.badge.get()
										},function(){
											mobserv.nav.forward('messages');
											mobserv.talkies.parsedom('messages',tid);
										});
									});
								}
							},1000);
						});
					}
					if (!$view.length && totalinmark){
						mobserv.notify.open({
							type : 'info',
							name : 'Mensagens',
							message : 'Você possui <b>'+totalinmark+'</b> novas mensagens',
							duration : 5000,
							tap : function(){ mobserv.nav.forward('talkies'); }
						});	
					}
					$Lroot.attr('mark',totalinmark);
					var str = new XMLSerializer().serializeToString(talkies.xml);
					mobserv.sqlite.query({query : 'update sl_talkies set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
					mobserv.talkies.mark();
				}
				if (ondone) ondone();
			},
			function(error){
				mobserv.talkies.autoget();
				mobserv.log({
					type : 'error',
					name : 'talkies.get',
					message : 'get talkies error: '+error
				});
				mobserv.notify.open({
					type : 'error',
					name : 'Erro ao verificar novas mensagens',
					message : error
				});	
				if(onerror) onerror(error);
			});
		},
		post : function(data,ondone,onerror){
			mobserv.log({
				name : 'talkies.post',
				message : 'talkie message post start'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			if (typeof data == 'object'){
				data.cid = client.code;
				data.sid = user.session;
				mobserv.server.call('service',data,function(response){
					talkies.response = response;
					var $Rxml = $(response);
					var $Rroot = $Rxml.find('mobserv');
					if ($Rroot.length == 0){
						if(onerror) onerror('mobserv node not found in service server response to talkies');
						return false;
					}
					$Rroot.children('command').each(function(){
						var $this = $(this);
						if (mobserv.talkies.command[$this.attr('exec')]) mobserv.talkies.command[$this.attr('exec')]($this.text(),response);
						$this.remove();
					});
					var $Rvalid = $Rroot.find('validation');
					$Rvalid.each(function(){
						var $this = $(this);
						var status = $this.attr('status');
						if (status != 'info' || status != 'notice'){
							if(onerror) onerror(htmldecode($this.text()));
							return false;
						}
						$this.remove();
					});
					var $Rtalk = $Rroot.children('talk');
					if ($Rtalk.length){
						var $Rmsg = $Rtalk.children('message');
						var $Ltalk = $(talkies.xml).find('talk[id="'+$Rtalk.attr('id')+'"]');
						if ($Ltalk.length){
							$Ltalk.append($Rmsg);
							var str = new XMLSerializer().serializeToString(talkies.xml);
							mobserv.sqlite.query({query : 'update sl_services set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
							if (ondone) ondone();
						} else {
							if(onerror) onerror('local talk node not found');
							return false;
						}
					} else {
						if(onerror) onerror('remote talk node not found');
						return false;
					}
				},
				function(error){
					if(onerror) onerror(error);
				});
			}
		},
		read : function(id){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			if (!talkies.xml) return false;
			var $dom = {}
			var $xml = {}
			$xml.root = $(talkies.xml).find('mobserv');
			var totalinmark = parseInt($xml.root.attr('mark'));
			$xml.talk = $xml.root.find('talk[id="'+id+'"]');
			var mark = parseInt($xml.talk.attr('mark'));
			totalinmark = totalinmark - mark;
			$xml.root.attr('mark',totalinmark);
			$xml.talk.attr('readed','true');
			$xml.talk.attr('mark','0');
			$dom.messages = $('#messages');
			$dom.talkies = $('#talkies');
			$dom.talk = $dom.talkies.find('.link[data-id="'+id+'"]');
			$dom.talk.addClass('readed');
			$dom.messages.find('#header h1').text($xml.talk.attr('name'));
			$dom.messages.find('#header h2').text($xml.talk.attr('subject'));
			var $markserv = $dom.talk.find('mark');
			$markserv.transition({opacity:0,scale:0.01},300,function(){ $markserv.text('0') });
			var str = new XMLSerializer().serializeToString(talkies.xml);
			mobserv.sqlite.query({query : 'update sl_talkies set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
			mobserv.talkies.mark();
		},
		remove : function(id){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			if (!talkies.xml) return false;
			var $dom = {}
			var $xml = {}
			$xml.root = $(talkies.xml).find('mobserv');
			$xml.talk = $xml.root.find('talk[id="'+id+'"]');
			$xml.talk.find('message').remove();
			mobserv.talkies.cleardom();
			var str = new XMLSerializer().serializeToString(talkies.xml);
			mobserv.sqlite.query({query : 'update sl_talkies set xml = ? where code = "'+client.code+'" and login = "'+user.login+'"', statement : [str]});
			if (navigator.vibrate) navigator.vibrate(100);
		},
		parsedom : function(type,id){
			if (!type){
				var current = mobserv.nav.getCurrentId();
				if (current == 'talkies') {
					type = 'talkies'; 	
				} else if (current == 'messages') {
					type = 'messages';
				}
			}
			mobserv.log({
				name : 'talkies.parsedom',
				message : 'parsedom '+type+((id)?' #'+id:'')+' started'
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var talkies = mobserv.globals.talkies;
			if (!talkies.xml) return false;
			var $html = '';
			var $dom = {}
			var $xml = {}
			$xml.root = $(talkies.xml).find('mobserv');
			$xml.talk = $xml.root.children('talk[id="'+id+'"]');
			if (type == 'talkies'){
				$dom.talkies = $('#talkies');
				$dom.list = $dom.talkies.find('.list');
				if ($xml.talk.length){
					var $s = $xml.talk;
					var mark = parseInt($s.attr('mark') || '0');
					$html += ''+
					'<li>'+
						'<div class="table link'+((!mark)?' readed':'')+'" data-view="messages" data-direction="forward" data-id="'+$s.attr('id')+'">'+
							'<div><div class="icon icon-paperplane" style="color:'+$s.attr('color')+'"></div><mark class="blue">'+mark+'</mark></div>'+
							'<div>'+
								'<h2 style="color:'+$s.attr('color')+'">'+$s.attr('name')+'</h2>'+
								'<p><b style="color:'+$s.attr('color')+'">'+$s.attr('subject')+'</b></p>'+
								'<p><small>Ultima interação: '+$s.attr('lastdate')+'</small></p>'+
							'</div>'+
						'</div>'+
					'</li>';
					$dom.list.find('.link[data-id="'+$s.attr('id')+'"]').parent().remove();
					if(mark) $dom.list.prepend($html);
					else $dom.list.append($html);
					var $markserv = $dom.list.find('.link[data-id="'+$s.attr('id')+'"] mark');
					if (mark > 0){
						$markserv.show().transition({opacity:1,scale:1.5},300,function(){ $markserv.text(mark).transition({scale:1},200); });
					} else {
						if ($markserv.text() != '0') $markserv.transition({opacity:0,scale:0.01},300,function(){ $markserv.text('0').hide(); });	
					}
				}				
			} else if (type == 'messages') {
				$dom.messages = $('#messages');
				$dom.chat = $dom.messages.find('.chat').html('');
				$xml.talk = $xml.root.children('talk[id="'+id+'"]');
				$xml.msgs = $xml.talk.find('message');
				$dom.messages.find('#header .remove').data('id',id);
				$xml.msgs.each(function(){
					var $s = $(this), $mark;
					if ($s.attr('me')){
						$html += ''+
						'<div class="talk me" id="'+$s.attr('id')+'">'+
							'<div class="text">'+$s.text()+'</div>'+
							'<div class="info"><span class="icon-clock">'+$s.attr('time')+'</span></div>'+
						'</div>'+
						'<div class="clear"></div>';
					} else {
						$html += ''+
						'<div class="talk" id="'+$s.attr('id')+'">'+
							'<div class="text">'+$s.text()+'</div>'+
							'<div class="info"><strong class="icon-user2">'+$s.attr('sender')+'</strong><span class="icon-clock">'+$s.attr('time')+'</span></div>'+
						'</div>'+
						'<div class="clear"></div>';
					}
					$dom.chat.html($html);
					if ($s.attr('new') == 'new'){
						$dom.talk = $dom.chat.find('.talk#'+$s.attr('id'));
						$dom.talk.transition({scale:1.1},200,function(){ $dom.talk.transition({scale:1},150); });
						$s.removeAttr("new");
					}
				});
			}
		},
		cleardom : function(type){
			if (!type || type == 'messages'){
				$('#messages .chat').html('');
			} 
		},
		mark : function(){
			var talkies = mobserv.globals.talkies;
			if (!talkies.xml) return false;
			var $root = $(talkies.xml).find('mobserv');
			var totalinmark = parseInt($root.attr('mark'));
			var $markhome = $('#home [data-view="talkies"] mark');
			var $markfoot = $('#footer [data-view="talkies"] mark');
			if (totalinmark){
				$markhome.text(totalinmark).transition({opacity:1,scale:1.5},300,function(){ $markhome.transition({scale:1},200) }).closest('a').removeClass('unmarked');
				$markfoot.text(totalinmark).transition({opacity:1,scale:1.5},300,function(){ $markfoot.transition({scale:1},200) }).parent().addClass('marked');
			} else {
				$markhome.transition({opacity:0,scale:0.01},300,function(){ $markhome.text('0'); });	
				$markfoot.transition({opacity:0,scale:0.01},300,function(){ $markfoot.text('0'); }).parent().removeClass('marked');	
			}
			//mobserv.badge.set();
		}
	},
	zindex : 3,
	preventTap : false,
	timeoutTap : null,
	history : [],
	nav : {
		getCurrentId : function(){
			var $current = $('.view.current:last');
			return $current.attr('id');
		},
		getCurrentView : function(viewid){
			return $(((viewid)?'#'+viewid:'.view')+'.current:last');
		},
		toView : function($view){
			var $current = $('.view.current:last');
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
					$view.trigger('current');
				});
			}
			$view.trigger('show');
			mobserv.zindex++;
		},
		foreground : function($view){
			mobserv.zindex = mobserv.zindex + 3;
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($view.length == 1){
				$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 300);
			}
			$view.trigger('show');
			mobserv.zindex++;
		},
		close : function($view){
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($view.length == 1){
				$view.transition({ opacity:0 }, 300,function(){
					$view.hide();
					$view.trigger('hide');
				});
			}
		},
		forward : function($view){
			var $current = $('.view.current:last');
			$view = (typeof $view == 'string') ? $('#'+$view) : $view;
			if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
				mobserv.history.push($current);
				$current.transition({ x:0, opacity:1 }, 300, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:(($('#nav').hasClass('active'))?'-80%':'30%'), opacity:0, 'z-index':mobserv.zindex}).show().transition({ x:0, opacity:1 }, 300, function(){
					$view.addClass('current');
					$view.trigger('current');
				});
				$view.trigger('show');
				$current.trigger('hide');
			}
			mobserv.zindex++;
		},
		back : function(){
			if (mobserv.history.length > 0){
				var $current = $('.view.current:last');
				$view = mobserv.history.pop();
				if ($current.length == 1 && $view.length == 1 && $current.attr('id') != $view.attr('id')){
					$current.transition({ x:'30%', opacity:0 }, 300, function(){
						$current.hide().removeClass('current');
					});
					$view.css({x:0, opacity:1}).show().transition({ opacity:1 }, 300, function(){
						$view.addClass('current');
						$view.trigger('current');
					});
					$view.trigger('show');
					$current.trigger('hide');
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
				var id = $a.data('id');
				var src = $a.data('source');
				if (id) $view.data('id',id);
				if (src) $view.data('source',src);
			}
			var direction = $a.data('direction');
			if ($view){
				if (direction == 'forward'){
					mobserv.nav.forward($view);
				} else if (direction == 'foreground'){
					mobserv.nav.foreground($view);
				} else if (direction == 'close'){
					mobserv.nav.close($view);
				} else {
					mobserv.nav.toView($view);
				}
			} else if (direction == 'back'){
				mobserv.nav.back();
			}
		}
	},
	mark : {			
	},
	badge : {
		set : function(){
			// set badges inside dom interafce
		},
		get : function(){
			var $markservices = $('#home [data-view="servicelist"] mark');
			var $marktalkies = $('#home [data-view="talkies"] mark');
			var ms = (($markservices.length) ? parseInt($markservices.text()) : 0) || 0;
			var mt = (($marktalkies.length) ? parseInt($marktalkies.text()) : 0) || 0;
			ms = (typeof ms == "number") ? ms : 0;
			mt = (typeof mt == "number") ? mt : 0;
			var bdg = ms + mt;
			mobserv.log({
				name : 'badge.get',
				message : 'badge number: '+bdg
			});
			return bdg;
		}
	},
	notification : {
		id : 1,
		events : [],
		inited : false, 
		init : function(){
			window.plugin.notification.local.cancelAll();
			cordova.plugins.notification.local.registerPermission(function (granted) {
				mobserv.log({
					type : 'notice',
					name : 'notification.init',
					message : 'notification permission: '+granted
				});
			});
			cordova.plugins.notification.local.on("trigger", function (n){
				var events = mobserv.notification.events[n.id];
				if(events && events.trigger) events.trigger(n);
			});
			cordova.plugins.notification.local.on("click", function (n){
				var events = mobserv.notification.events[n.id];
				if(events && events.click) events.click(n);
			});
			mobserv.notification.inited = true;
		},
		open : function(options,onclick,ontrigger){
			if (!mobserv.notification.inited || !mobserv.bgmode.active) return;
			if (navigator.vibrate) navigator.vibrate(300);
			var id = (options.id) ? options.id : mobserv.notification.id;
			mobserv.notification.id++;
			cordova.plugins.notification.local.schedule({
				id: id,
				title: $('<span>'+htmldecode(options.title)+'</span>').text(),
				text: $('<span>'+htmldecode(options.text)+'</span>').text(),
				badge: (options.badge)? options.badge : 0,
				sound: (options.sound)? 'file://sounds/'+options.sound : null,
				icon: (options.icon)? 'file://pic/'+options.icon : null,
				data: options.data
			});
			if(ontrigger) mobserv.notification.events[id] = {trigger:ontrigger};
			if(onclick) mobserv.notification.events[id] = {click:onclick};
		}
	},
	notify : {
		list : [],
		exec : function(){
			if (mobserv.notify.list.length){
				if (navigator.vibrate) navigator.vibrate(300);
				var notify = mobserv.notify.list[0];
				var $notify = $('#notify');
				var $hide = $notify.find('.hide');
				var $content = $notify.find('.content');
				$notify.find('strong').html((notify.name)?htmldecode(notify.name):'');
				$notify.find('span').html((notify.message)?htmldecode(notify.message):'');
				$notify.find('small').html((notify.detail)?htmldecode(notify.detail):'');
				$notify.removeClass('error alert info notice').addClass((notify.type)?notify.type:'').show().css({transform:'translate(0px, 40px);', opacity:0}).transition({ y:0, opacity:1 }, 300, function(){
					notify.timeout = setTimeout(function(){
						mobserv.notify.close();
					},notify.duration);
				});
				$hide.off('tap');
				$hide.one('tap',function(event){
					event.preventDefault();
					event.stopPropagation();
					mobserv.notify.close();
				});
				$content.off('touchstart');
				$content.one('touchstart',function(){
					mobserv.notify.close();
					if(notify.tap) notify.tap();
				});
			}
		},
		close : function(){
			var notify = mobserv.notify.list[0];
			var $notify = $('#notify');
			if(notify && notify.timeout) clearTimeout(notify.timeout);
			$notify.transition({ y:'40px', opacity:0 }, 300, function(){
				$notify.hide();
				mobserv.notify.list.shift();
				mobserv.notify.exec();
			});
		},
		open : function(notify){
			if(mobserv.bgmode.active) return false;
			notify.id = $.md5(notify.type+notify.name+notify.message);
			notify.duration = notify.duration || 3000;
			notify.timeout = null;
			$.each(mobserv.notify.list||[],function(i,n){
				if(n.id == notify.id) notify.ignore = true;
			});
			if (!notify.ignore){
				if (mobserv.notify.list.length == 0){
					mobserv.notify.list.push(notify);
					mobserv.notify.exec();
				} else {
					mobserv.notify.list.push(notify);	
				}
			}
		}
	},
	'log' : function(obj){
		if (obj.type == 'error' && navigator.vibrate && !mobserv.bgmode.active) navigator.vibrate(500);
		if (mobserv.debug.active || (!mobserv.debug.active && obj.type == 'error')){
			var html = ''+
			'<div class="logline '+((obj.type)?obj.type:'')+'"><b class="date">['+mobserv.now()+' '+Date.now()+']</b> '+
			((obj.name)?'<b class="name">'+htmldecode(obj.name)+'</b> ':'')+
			((obj.title)?'<b class="title">'+htmldecode(obj.title)+'</b> ':'')+
			((obj.message)?'<br><span class="message">'+htmldecode(obj.message)+'</span> ':'')+
			((obj.detail)?'<br><span class="detail">'+htmldecode(obj.detail)+'</span> ':'')+
			'</div>';
			$("#log .section").prepend(html);
			if (obj.type == 'error'){
				var $markfoot = $('#footer [data-view="log"] mark');
				$markfoot.transition({opacity:1,scale:1.5},200,function(){ $markfoot.transition({scale:1},200).parent().addClass('marked'); });
			}
			if(!mobserv.device.data.cordova) console.log('log',obj);
		}
	},
	unlog : function(){
		if (navigator.vibrate) navigator.vibrate(100);
		$("#log .section").html('');
		var $markfoot = $('#footer [data-view="log"] mark');
		if ($markfoot.parent().hasClass('marked')) $markfoot.transition({opacity:1,scale:1.5},200,function(){ $markfoot.transition({scale:.1,opacity:0},400).parent().removeClass('marked'); });
	},
	now : function(type){
		type = (!type)?'datetime':type;
		var d = new Date;
		if (type == 'datetime'){
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
		} else if (type == 'date') {
			return [
				d.getFullYear(),
				("0" + (d.getMonth() + 1)).substr(-2),
				("0" + d.getDate()).substr(-2)
			].join('-');
		} else if (type == 'time') {
			return [
				("0" + d.getHours()).substr(-2),
				("0" + d.getMinutes()).substr(-2),
				("0" + d.getSeconds()).substr(-2)
			].join(':');
		} else if (type == 'timestamp') {
			return d.getTime();
		}
	},
	exit : function(){
		if (navigator && navigator.app) {
			mobserv.log({
				type : 'notice',
				name : 'mobserv.exit',
				message : 'app will be closed'
			});
			navigator.app.exitApp();
		} else if (navigator && navigator.device) {
			mobserv.log({
				type : 'notice',
				name : 'mobserv.exit',
				message : 'device will be closed'
			});
			navigator.device.exitApp();
		} else {
			mobserv.log({
				type : 'error',
				name : 'mobserv.exit',
				message : 'app wont be closed'
			});
		}
	}
}

