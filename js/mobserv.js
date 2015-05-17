// JavaScript Document

var mobserv = {
	globals : {
		client : {},
		user : {}	
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
		timeout : 30000,
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
		queue : [],
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
					message : 'init test on '+type+' server '+server.url,
				});
				if (type === server.type){
					server.status = 'Conectando';
					var cfg = {
						xhrobj : null,
						aborttime : null,
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
						error: function(xhr,st,err){
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
						complete: function(){
							server.lastRequest = mobserv.now();
							mobserv.server.data(server);
							if (mobserv.server.pointer == mobserv.server.list.length){
								mobserv.server.pointer = 0;	
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
							detail : decodeURIComponent($.param(data)).replace(/\&/g,"<br>&")
						});
						if(ondone) ondone(response,st,xhr);
					} else {
						server.online = false;
						server.status = 'Erro de Parser';
						server.lastRequest = mobserv.now();
						mobserv.log({
							type : 'error',
							name : 'server.call',
							message : 'default '+type+' server response invalid xml',
							detail : decodeURIComponent( $.param(data)).replace(/\&/g,"<br>&")
						});
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
						detail : decodeURIComponent( $.param(data)).replace(/\&/g,"<br>&")
					});
					mobserv.server.loopcall(type,data,ondone,onerror);
				}, 
				complete: function(){
					server.lastRequest = mobserv.now();
					mobserv.server.data(server);
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
							detail : decodeURIComponent( $.param(data)).replace(/\&/g,"<br>&")
						});
					},mobserv.server.timeout/2);
				}
			};
			cfg.xhrobj = mobserv.server.ajax(cfg);
		},
		ajax : function(cfg){
			if (!mobserv.connection.test()){
				cfg.queued = true;
				mobserv.server.queue.push(cfg);
			} else {
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
			mobserv.device.data = device;
			var $dom = $("#deviceinfo");
			if ($dom.length){
				if (typeof device == 'object'){
					if (device.platform == 'iOS') $('#main').addClass('ios');
					$dom.find('#cordova').html(device.cordova); 		
					$dom.find('#model').html(device.model); 		
					$dom.find('#platform').html(device.platform); 		
					$dom.find('#uuid').html(device.uuid); 
					$dom.find('#version').html(device.version); 
					mobserv.device.ready = true;
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
					var $map = $dom.find("img.map");
					$map.show().css({opacity:1}).get(0).src = 'http://maps.googleapis.com/maps/api/staticmap?center='+pos.coords.latitude+','+pos.coords.longitude+'&zoom=14&size='+$(window).width()+'x200&sensor=false';
				}
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
							'Cli_Id integer primary key, '+
							'Cli_Name text, '+
							'Cli_Code text, '+
							'Cli_Pw text, '+
							'Cli_License text, '+
							'Cli_Install text, '+
							'Cli_Default integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_users ('+
							'Usr_Id integer primary key, '+
							'Cli_Code text, '+
							'Usr_Login text, '+
							'Usr_Pw text, '+
							'Usr_Name text, '+
							'Usr_Default integer '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_services ('+
							'Srv_Id integer primary key, '+
							'Cli_Id integer, '+
							'Usr_Id integer, '+
							'Srv_Date text, '+
							'Srv_Xml text, '+
							'Srv_Status text '+
						')'
					);
					tx.executeSql(''+
						'CREATE TABLE IF NOT EXISTS sl_messages ('+
							'Msg_Id integer primary key, '+
							'Cli_Id integer, '+
							'Usr_Id integer, '+
							'Msg_Xml text, '+
							'Msg_Read integer, '+
							'Msg_Status text '+
						')'
					);
					mobserv.log({
						type : 'info',
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
						type : 'info',
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
					tx.executeSql(query, [],
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
	keyboard : {
		close  : function(){
			if (cordova && cordova.plugins && cordova.plugins.Keyboard) cordova.plugins.Keyboard.close();	
		}
	},
	auth : {
		clientdom : function(){
			var client = mobserv.globals.client;
			$('#formuser .client').text(client.Cli_Name);
			$('#nav .client').text(client.Cli_Name);
		},
		userdom : function(){
			var user = mobserv.globals.user;
			$('#footer .user strong').text(user.Usr_Login);
			$('#footer .user small').text(user.Usr_Name);
		},
		logout : function(what){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			if(user.Usr_Id && (what == 'client' || what == 'user' || !what)){
				var $form = $('#formuser');
				mobserv.sqlite.query(
					'update sl_users set Usr_Default = 0 where Usr_Id = "'+user.Usr_Id+'"',
					function(res){
						user.Usr_Default = 0;
						$form.find('.input').val('');
						$form.find('.input, .submit').removeClass('courtain disable');
						if(what == 'user'){
							$('.footer').transition({ y:'+=50px' }, 300);
						}
						mobserv.log({
							type : 'info',
							name : 'auth.logout.user',
							message : 'user '+user.Usr_Login+' was loged out'
						});	
					}
				);
			}
			if(client.Cli_Id && (what == 'client' || !what)){
				var $form = $('#formclient');
				mobserv.sqlite.query(
					'update sl_clients set Cli_Default = 0 where Cli_Id = "'+client.Cli_Id+'"',
					function(res){
						client.Cli_Default = 0;
						$form.find('.input').val('');
						$form.find('.input, .submit').removeClass('courtain disable');
						$('.footer').transition({ y:'+=50px' }, 300);
						mobserv.log({
							type : 'info',
							name : 'auth.logout.client',
							message : 'client '+client.Cli_Code+' was loged out'
						});	
					}
				);
			}
		},
		client : function(res,data,ondone,onerror) {
			if(!mobserv.connection.test()) return false;
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
					if (status == 'info'){
						var $lic = $response.find('licence:eq(0)');
						client.Cli_Name = $lic.attr('name');
						client.Cli_Code = $lic.attr('customer');
						client.Cli_License = $lic.attr('id');
						client.Cli_Install = $lic.attr('installNumber');
						client.Cli_Default = 1;
						if (res.rows.length == 0){
							mobserv.sqlite.query(
								'insert into sl_clients ('+
									'Cli_Name, '+
									'Cli_Code, '+
									'Cli_Pw, '+
									'Cli_License, '+
									'Cli_Install, '+
									'Cli_Default'+
								') values ('+
									'"'+client.Cli_Name+'",'+
									'"'+client.Cli_Code+'",'+
									'"'+client.Cli_Pw+'",'+
									'"'+client.Cli_License+'",'+
									'"'+client.Cli_Install+'",'+
									''+client.Cli_Default+''+
								')',
								function(res){
									client.Cli_Id = res.insertId;	
								}
							);	
						} else {
							mobserv.sqlite.query(
								'update sl_clients set '+
									'Cli_Name = "'+client.Cli_Name+'", '+
									'Cli_Code = "'+client.Cli_Code+'", '+
									'Cli_Pw = "'+client.Cli_Pw+'", '+
									'Cli_License = "'+client.Cli_License+'", '+
									'Cli_Install = "'+client.Cli_Install+'", '+
									'Cli_Default = '+client.Cli_Default+' '+
								'where Cli_Code = "'+client.Cli_Code+'"'
							);
						}
						var $service = $response.find('configs service');
						if ($service.length > 0){
							$service.each(function(){
								var $srv = $(this);
								var server = $srv.attr('server');
								var sinterval = $srv.attr('interval');
								if (server){
									mobserv.server.list.push({
										id : 'srv'+mobserv.server.list.length,
										type : 'service',
										url : server,
										online : false,	
										status : null,
										lastRequest : null,
										interval : parseInt((sinterval)?sinterval:300)
									});
									mobserv.log({
										type : 'notice',
										name : 'auth.client.serviceserver',
										message : 'added service server: '+server,
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
				if(onerror) onerror(response);
			});
		},
		user : function(res,data,ondone,onerror) {
			if(!mobserv.connection.test()) return false;
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
					if (status == 'info'){
						var $oauth = $response.find('oauth:eq(0)');
						user.Cli_Code = $oauth.attr('customer');
						user.Usr_Name = $oauth.attr('name');
						user.Usr_Login = $oauth.attr('user');
						user.Usr_Default = 1;
						if (res.rows.length == 0){
							mobserv.sqlite.query(
								'insert into sl_users ('+
									'Cli_Code, '+
									'Usr_Name, '+
									'Usr_Login, '+
									'Usr_Pw, '+
									'Usr_Default'+
								') values ('+
									'"'+client.Cli_Code+'",'+
									'"'+user.Usr_Name+'",'+
									'"'+user.Usr_Login+'",'+
									'"'+user.Usr_Pw+'",'+
									''+user.Usr_Default+''+
								')',
								function(res){
									user.Usr_Id = res.insertId;	
								}
							);	
						} else {
							mobserv.sqlite.query(
								'update sl_users set '+
									'Cli_Code = "'+user.Cli_Code+'", '+
									'Usr_Name = "'+user.Usr_Name+'", '+
									'Usr_Pw = "'+user.Usr_Pw+'", '+
									'Usr_Default = '+user.Usr_Default+' '+
								'where Usr_Login = "'+user.Usr_Login+'"'
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
			if(!mobserv.connection.test()){
				$('#preload').removeClass('courtain');
				$('#preload .loadinfo').text('Sem internet :(');
				return false;
			}
			mobserv.log({
				name : 'auth.init',
				message : 'auth initialized',
			});
			mobserv.sqlite.query(
				'select * from sl_clients where Cli_Default = 1',
				function(res){
					if (res.rows.length == 0){
						mobserv.nav.toView('formclient');
					} else {
						$('#preload .loadinfo').text('Validando cliente...');
						var client = mobserv.globals.client = res.rows.item(0);
						var data = {
							'exec': 'getLicense',
							'in': client.Cli_Install,
							'cid': client.Cli_Code,
							'pw': client.Cli_Pw
						};
						mobserv.auth.client(res,data,function(validation){
							mobserv.sqlite.query(
								'select * from sl_users where Cli_Code = '+client.Cli_Code+' and Usr_Default = 1',
								function(res){
									if (res.rows.length == 0){
										mobserv.nav.toView('formuser');
										mobserv.notify.open({
											type : 'info',
											name : 'Validação de Cliente',
											message : validation
										});	
									} else {
										$('#preload .loadinfo').text('Autenticando o usuário...');
										var user = mobserv.globals.user = res.rows.item(0);
										var data = {
											'exec': 'authUser',
											'in': client.Cli_Install,
											'cid': client.Cli_Code,
											'us': user.Usr_Login,
											'pw': user.Usr_Pw
										};
										mobserv.auth.user(res,data,function(){
											$('.footer').transition({ y:0 }, 300);
											mobserv.nav.toView('home');
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
			console.log($view,$current);
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
	notify : {
		list : [],
		exec : function(){
			if (mobserv.notify.list.length){
				var notify = mobserv.notify.list[0];
				var $notify = $('#notify');
				$notify.find('strong').text((notify.name)?notify.name:'');
				$notify.find('span').text((notify.message)?notify.message:'');
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
	},
}

