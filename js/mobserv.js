// JavaScript Document

var mobserv = {
	globals : {
		client : {},
		user : {},
		services : {},
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
		},
		off : function(){
			$('#main').removeClass('debug');
			mobserv.debug.active = false;
		}
	},
	server : {
		timeout : 60000,
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
			var pointer = mobserv.server.pointer;
			var server = mobserv.server.list[pointer];
			if (server){
				mobserv.log({
					name : 'server.test',
					message : 'init test on '+type+' server '+server.url,
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
								$('#preload .loadinfo').text('Algo deu errado :(');	
							}
						}, 
						error: function(xhr,st,err){
							server.online = false;
							server.status = 'Erro de Resposta';
							mobserv.log({
								type : 'error',
								name : 'server.test',
								message : server.url+' response error ('+((err)?err:'unknown')+')',
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
									message : server.url+' response timeout)',
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
			var limit = (mobserv.server.timeout*2)/100;
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
							message : 'no '+type+' servers available',
						});
						if(onerror) onerror('Os servidores de '+((server.type == 'license')?'validação de licença':'serviço do cliente')+' não responderam');
						clearInterval(interval);
					}
				} else {
					clearInterval(interval);	
				}
				limit--;
			},100);
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
			mobserv.log({
				name : 'server.call',
				message : 'default '+type+' server request called',
			});
			server.status = 'Conectando';
			var cfg = {
				xhrobj : null,
				aborttime : null,
				message : 'Conectando ao '+mobserv.globals.translate[type]+'...',
				type: 'GET', 
				url: server.url, 
				dataType: 'xml',
				data: data,
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
					version : mobserv.device.data.version,
				}
				var pos = mobserv.geolocation.position;
				cfg.data.lat = pos.latitude;
				cfg.data.lon = pos.longitude;
				cfg.data.acr = pos.accuracy;
				cfg.data.alt = pos.altitudeAccuracy;
				cfg.data.head = pos.heading;
				cfg.data.gpstimestamp = pos.timestamp;
			}
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
			mobserv.device.ready = true;
			if (typeof getAppVersion == 'function'){
				getAppVersion(function(version){
					mobserv.device.data.appver = version;
				});
			}
			if (typeof device == 'object'){
				mobserv.device.data = device;
				mobserv.log({
					type : 'notice',
					name : 'device.onready',
					message : 'device '+mobserv.device.data.platform+' is ready',
				});	
			} else {
				mobserv.device.data.cordova = 'N/A';
				mobserv.device.data.model = ($.browser.mobile)?'Mobile':'Desktop';
				mobserv.device.data.platform = $.browser.platform;
				mobserv.device.data.uuid = $.md5($.browser.name+$.browser.platform+$.browser.version+$.browser.versionNumber);
				mobserv.device.data.version = $.browser.version;
				mobserv.log({
					type : 'alert',
					name : 'device.onready',
					message : 'native device properties not available',
				});	
			}
			if (mobserv.device.data.platform == 'iOS') $('#main').addClass('ios');
			var $dom = $("#deviceinfo");
			if ($dom.length){
				$dom.find('#appver').html(mobserv.device.data.appver); 		
				$dom.find('#cordova').html(mobserv.device.data.cordova); 		
				$dom.find('#model').html(mobserv.device.data.model); 		
				$dom.find('#platform').html(mobserv.device.data.platform); 		
				$dom.find('#uuid').html(mobserv.device.data.uuid); 
				$dom.find('#version').html(mobserv.device.data.version); 
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
		position : {},
		interval : null,
		watchID : null,
		animID : null,
		animate : function(marker,circle){
			var numDeltas = 25;
			var delay = 10; //milliseconds
			var i = 0;
			var deltaLat;
			var deltaLng;
			var deltaAcr;
			var lat = marker.getPosition().lat();
			var lng = marker.getPosition().lng();
			var acr = circle.getRadius();
			function transition(){
				i = 0;
				deltaLat = (mobserv.geolocation.position.latitude - lat)/numDeltas;
				deltaLng = (mobserv.geolocation.position.longitude - lng)/numDeltas;
				deltaAcr = (mobserv.geolocation.position.accuracy - acr)/numDeltas;
				move();
			}
			function move(){
				lat += deltaLat;
				lng += deltaLng;
				acr += deltaAcr;
				var latlng = new google.maps.LatLng(lat,lng);
				marker.setPosition(latlng);
				circle.setCenter(latlng);
				circle.setRadius(acr)
				if(i!=numDeltas){
					i++;
					setTimeout(move, delay);
				}
			}
			transition();
		},
		panMap : function(force){
			var $map = $('.view#map:visible .map');
			if ($map.length){
				var $location = $('.view#map:visible .item.location');
				$map.gmap3({
					get: {
						name:"marker",
						tag: "mydevice",
						callback: function(marker){
							if (marker){
								var newpos = new google.maps.LatLng(mobserv.geolocation.position.latitude,mobserv.geolocation.position.longitude);
								$map.gmap3({
									get: {
										name:"circle",
										callback: function(circle){
											if (circle){
												if (force || $location.hasClass('hilite')){
													$map.gmap3('get').panTo(newpos);
												}
												mobserv.geolocation.animate(marker,circle);
												//marker.animateTo(newpos,{easing:'easeInOutCubic',duration: 250});
											}
										}
									}
								})
							}
						}
					}
				});
			}
		},
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
			mobserv.geolocation.panMap();
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
			options = options||{};
			mobserv.geolocation.getPosition(options);
			if(mobserv.geolocation.interval) clearInterval(mobserv.geolocation.interval);
			mobserv.geolocation.interval = setInterval(function(){
				mobserv.geolocation.getPosition(options);
			},60000);
			mobserv.log({
				name : 'geolocation.autoPosition',
				message : 'auto scheduled position started',
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
					detail : 'lat: '+pos.coords.latitude+', lng: '+pos.coords.longitude,
				});	
			}, function(error){
				mobserv.log({
					type : 'error',
					name : 'geolocation.getPosition',
					code : error.code,
					message : error.message,
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
				message : 'watch position started',
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
					message : error.message,
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
				message : 'watch position cleared',
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
				message : 'db mobserv.db initializing',
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
						'CREATE TABLE IF NOT EXISTS sl_messages ('+
							'"id" integer primary key, '+
							'"code" text, '+
							'"login" text, '+
							'"xml" text, '+
							'"read" integer, '+
							'"status" text '+
						')'
					);
					mobserv.log({
						type : 'notice',
						name : 'sqlite.create',
						message : 'tables in mobserv.db are idle',
					});	
				},
				function(e) {
					mobserv.log({
						type : 'error',
						name : 'sqlite.create',
						message : 'transaction error: '+e.message,
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
					tx.executeSql('DROP TABLE IF EXISTS sl_messages');
					mobserv.log({
						type : 'notice',
						name : 'sqlite.clear',
						message : 'tables in mobserv.db was cleared',
					});
					mobserv.sqlite.create();
				},
				function(e) {
					mobserv.log({
						type : 'error',
						name : 'sqlite.clear',
						message : 'transaction error: '+e.message,
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
						message : 'no database available',
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
					message : 'databse is stoped',
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
								detail : 'rows: '+res.rows.length+', rowsAffected: '+res.rowsAffected,
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
						detail : query,
					});	
				});
			}
		},
	},
	keyboard : {
		close  : function(){
			if (cordova && cordova.plugins && cordova.plugins.Keyboard) cordova.plugins.Keyboard.close();	
		}
	},
	auth : {
		clientdom : function(){
			var client = mobserv.globals.client;
			$('#formuser .client').text(client.name);
			$('#nav .client').text(client.name);
		},
		userdom : function(){
			var user = mobserv.globals.user;
			$('#footer .user strong').text(user.login);
			$('#footer .user small').text(user.name);
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
		},
		client : function(res,data,ondone,onerror) {
			var client = mobserv.globals.client;
			mobserv.server.call('license',data,function(response){
				var $response = $(response);
				var $valid = $response.find('validation:eq(0)');
				if ($valid.length){
					var status = $valid.attr('status');
					mobserv.log({
						type : status,
						name : 'auth.client',
						message : status+' validation: '+$valid.text(),
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
								var url = $srv.attr('url');
								var sinterval = $srv.attr('interval');
								if (url){
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
										message : 'added service server: '+url,
									});
								} else {
									mobserv.log({
										type : 'error',
										name : 'auth.client',
										message : 'client do not have a service server url',
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
								message : 'client do not have a service server',
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
				var $response = $(response);
				var $valid = $response.find('validation:eq(0)');
				if ($valid.length){
					var status = $valid.attr('status');
					mobserv.log({
						type : status,
						name : 'auth.user',
						message : status+' validation: '+$valid.text(),
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
				message : 'auth initialized',
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
												mobserv.services.get();
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
		list : {},
		command : {
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
							message : total+' nodes '+((param)?' "'+param+'"':'')+' were removed',
						});
					}
				);
			}
		},
		parsedom : function(type,id){
			mobserv.log({
				name : 'services.parsedom',
				message : 'parsedom '+((type)?type:'servicelist')+' started',
			});
			mobserv.services.cleardom(type);
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			if (!services.xml) return false;
			var $dom = {}
			var $xml = {}
			var $html = '';
			if (!type || type == 'servicelist'){
				$dom.services = $('#servicelist');
				$dom.list = $dom.services.find('.list').html('');
				$xml.root = $(services.xml).find('mobserv');
				$xml.service = $xml.root.find('service');
				$xml.service.each(function(){
					var $s = $(this), $l = {}, $t = {}, $mark;
					$s.children('layout:not([name="content"])').each(function(){ var $this = $(this); $l[$this.attr('name')]=$this.text(); });
					$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
					$mark = $s.children('mark');
					$html += ''+
					'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
						'<div class="table link" data-view="joblist" data-direction="forward" data-id="'+$s.attr('id')+'">'+
							'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div><mark class="'+$mark.attr('color')+'">'+$mark.text()+'</mark></div>'+
							'<div>'+
								'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
								$s.children('layout').filter('[name="content"]').each(function(){
									$html += '<p>'+$(this).text()+'</p>';
								});
							$html += ''+
							'</div>'+
						'</div>'+
					'</li>';
				});
				$dom.list.html($html);	
				var $markhome = $('#home [data-view="servicelist"] mark');
				var $markfoot = $('#footer [data-view="servicelist"] mark');
				var $rootmark = $xml.root.find('mark');
				$rootmark.each(function(){
					var $this = $(this);
					if ($this.text()){
						if (services.updated || !$markfoot.is(':visible')){
							$markhome.hide();
							$markfoot.hide();
							setTimeout(function(){
								$markhome.text($this.text()).addClass($this.attr('color')).fadeIn(250,function(){$markhome.css('transform','scale(1)');}).css('transform','scale(1.4)');
								$markfoot.text($this.text()).addClass($this.attr('color')).fadeIn(250,function(){$markfoot.css('transform','scale(1)');}).css('transform','scale(1.4)').parent().addClass('marked');
							},200);
						}
					} else {
						$markhome.fadeOut(250).css('transform', 'scale(0.1)');
						$markfoot.fadeOut(250).css('transform', 'scale(0.1)').parent().removeClass('marked');
					}
				});
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
					$s.children('layout').each(function(){ var $this = $(this); $l[$this.attr('name')]=$this.text(); });
					$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
					$html += ''+
					'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
						'<div class="table link" data-view="jobdetails" data-direction="forward" data-id="'+$s.attr('id')+'">'+
							'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div></div>'+
							'<div>'+
								'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
								$s.children('layout[name="content"]').each(function(){
									$html += '<p>'+$(this).text()+'</p>';
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
				$dom.gmap = $dom.detail.find('.gmap');
				$s = $(services.xml).find('job[id="'+id+'"]');
				$s.children('layout').each(function(){ var $this = $(this); $l[$this.attr('name')]=$this.html(); });
				$s.children('setting').each(function(){ var $this = $(this); $t[$this.attr('name')]=$this.attr('value'); });
				$html += ''+
				'<li style="display:'+(($s.attr('visible')=='true')?'block':'none')+'" style="'+(($s.attr('disable')=='true')?'.disable':'')+'">'+
					'<div class="table">'+
						'<div><div class="identifier" style="background-color:'+$l.indentifierColor+'">'+$l.indentifierLabel+'<strong>'+$l.indentifierNumber+'</strong></div></div>'+
						'<div>'+
							'<h2 style="color:'+$l.indentifierColor+'">'+$l.title+'</h2>';
							$s.children('layout[name="content"]').each(function(){
								$html += '<p>'+$(this).text()+'</p>';
							});
						$html += ''+
						'</div>'+
					'</div>'+
				'</li>';
				$dom.list.html($html);
				$html = '';
				$s.children('layout[name="detail"]').each(function(){
					var $this = $(this);
					$html += '<tr><td style="width:1%;white-space:nowrap;">'+$this.attr('label')+'</td><td><strong>'+$this.text()+'</strong></td></tr>';
				});
				if ($s.find('location').length){
					$dom.gmap.show().data('id',id);
				} else {
					$dom.gmap.hide();
				}
				$dom.dets.html($html);
			}
		},
		cleardom : function(type){
			if (!type || type == 'serviceslist'){
				$('#services .list li').remove();
			} else if (type == 'servicelist'){
				$('#service .list li').remove();
			}
		},
		init : function(ondone){
			mobserv.log({
				name : 'services.init',
				message : 'services initialized',
			});
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var services = mobserv.globals.services;
			mobserv.sqlite.query(
				'select xml from sl_services where code = "'+client.code+'" and login = "'+user.login+'"',
				function(res){
					if (res.rows.length > 0){
						if (res.rows.item(0).xml){
							services.xml = $.parseXML(res.rows.item(0).xml);
							var $xml = $(services.xml);
							services.requestKey = $xml.find('mobserv').attr('resultKey');
							mobserv.log({
								type : 'notice',
								name : 'services.init',
								message : $xml.length+' services dumped from local database',
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
		get : function(ondone){
			mobserv.log({
				name : 'services.get',
				message : 'services get start',
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
			mobserv.server.call('service',data,function(response){
				var $xml = $(response);
				var $root = $xml.find('mobserv');
				if ($root.length == 0){
					mobserv.log({
						type : 'error',
						name : 'services.get',
						message : 'mobserv node not found in service server response',
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
						name : 'services.get',
						message : status+' validation: '+$this.text(),
					});
					mobserv.notify.open({
						type : status,
						name : 'Serviços',
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
					name : 'services.get',
					message : 'get services error: '+error,
				});
				mobserv.notify.open({
					type : 'error',
					name : 'Erro ao sincronizar serviços',
					message : error
				});	
				mobserv.services.parsedom();
				if(onerror) onerror(error);
			});
		}
	},
	zindex : 3,
	preventTap : false,
	timeoutTap : null,
	history : [],
	nav : {
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
				});
				$view.trigger('show');
			}
			mobserv.zindex++;
		},
		foreground : function($view){
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
				$current.transition({ x:0, opacity:0 }, 300, function(){
					$current.hide().removeClass('current');
				});
				$view.css({x:'30%', opacity:0, 'z-index':mobserv.zindex}).show().transition({ x:0, opacity:1 }, 300, function(){
					$view.addClass('current');
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
					$view.css({x:0, opacity:0, 'z-index':mobserv.zindex}).show().transition({ opacity:1 }, 500, function(){
						$view.addClass('current');
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
		},
	},
	mark : {			
	},
	notify : {
		list : [],
		exec : function(){
			if (mobserv.notify.list.length){
				var notify = mobserv.notify.list[0];
				var $notify = $('#notify');
				$notify.find('strong').html((notify.name)?notify.name:'');
				$notify.find('span').html((notify.message)?notify.message:'');
				$notify.find('small').html((notify.detail)?notify.detail:'');
				$notify.removeClass('error alert info notice').addClass((notify.type)?notify.type:'').show().css({transform:'translate(0px, 40px);', opacity:0}).transition({ y:0, opacity:1 }, 500, function(){
					notify.timeout = setTimeout(function(){
						mobserv.notify.close();
					},notify.duration);
				});
				$notify.off('tap');
				$notify.one('tap',function(){
					mobserv.notify.close();
				});
			}
		},
		close : function(){
			var notify = mobserv.notify.list[0];
			var $notify = $('#notify');
			clearTimeout(notify.timeout);
			$notify.transition({ y:'40px', opacity:0 }, 500, function(){
				$notify.hide();
				mobserv.notify.list.shift();
				mobserv.notify.exec();
			});
		},
		open : function(notify){
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
		if (mobserv.debug.active || (!mobserv.debug.active && obj.type == 'error')){
			var html = ''+
			'<div class="logline '+((obj.type)?obj.type:'')+'"><b class="date">['+mobserv.now()+' '+Date.now()+']</b> '+
			((obj.name)?'<b class="name">'+obj.name+'</b> ':'')+
			((obj.title)?'<b class="title">'+obj.title+'</b> ':'')+
			((obj.message)?'<br><span class="message">'+obj.message+'</span> ':'')+
			((obj.detail)?'<br><span class="detail">'+obj.detail+'</span> ':'')+
			'</div>';
			$("#log .section").append(html);
		}
		console.log('log',obj);
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
		}
	},
	exit : function(){
		if (navigator && navigator.app) navigator.app.exitApp();
		else if (navigator && navigator.device) navigator.device.exitApp();
		else return false;
		return true;	
	}
}

