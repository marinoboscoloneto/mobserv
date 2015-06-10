// JavaScript Document


$(function(){
	
	var startX, startY, endX, endY, pull, $pullarea, $pullinfo;
	$(document)
		.on('submit','form',function(event){
			var $form = $(this);
			var $command = $form.find('.command');
			if ($command.length){
				var cmd = $command.val().toLowerCase();
				var executed = false
				if (cmd == 'debug:on') { mobserv.debug.on(); $command.val(''); executed = true; }
				if (cmd == 'debug:off') { mobserv.debug.off(); $command.val(''); executed = true; }	
				if (cmd == 'sqlite:reset') { mobserv.sqlite.clear(); mobserv.sqlite.create(); $command.val(''); executed = true; }
				if (cmd == 'app:restart' || cmd == 'app:reload') { setTimeout(function(){ location.reload(true); },1000); executed = true; }
				if (executed){
					mobserv.notify.open({
						type : 'alert',
						name : 'Comando',
						message : 'Comando '+cmd+' executado'
					});
					return false;
				}
			}
			var valid = true;
			var formdata = {}
			$form.find('.input:visible:not(:disabled,.disable), input[type="hidden"]:not(:disabled,.disable)').each(function(){
				var $this = $(this);
				formdata[$this.attr('name')] = $this.val();
				console.log($this.attr('name'),$this.prop('required'),$this.val());
				if (!$this.val() && $this.prop('required') === true){
					console.error($this.attr('name'),$this.prop('required'),$this.val());
					$this.addClass('invalid');
					valid = false;
					return false;
				}
			});
			if (!valid){
				mobserv.notify.open({
					type : 'error',
					name : 'Formulário',
					message : 'Os campos são requiridos'
				});	
			} else {
				console.log('formdata',event,formdata);
				$form.trigger('send',[formdata]);	
			}
			mobserv.keyboard.close();
			event.preventDefault();
			return false;
		})
		.on('send','#formclient',function(){
			var client = mobserv.globals.client;
			var $form = $(this);
			var $submit = $form.find('.submit');
			client.install = $.md5(mobserv.device.data.uuid);
			client.code = $form.find('#cid').val().toLowerCase();
			client.password = ($form.find('#cpw').val()) ? $.md5($form.find('#cpw').val()) : '';
			if (client.code && client.password){
				var data = {
					'exec': 'getLicense',
					'in': client.install,
					'cid': client.code,
					'pw': client.password
				};
				$form.find('.input, .submit').addClass('courtain disable').prop('disabled',true);
				mobserv.sqlite.query(
					'select * from sl_clients where code = "'+client.code+'"',
					function(res){
						mobserv.auth.client(res,data,function(validation){
							mobserv.nav.toView('formuser');
							$form.find('.input, .submit').removeClass('courtain');
							$form.find('.input').val('');
							mobserv.notify.open({
								type : 'info',
								name : 'Validação de Cliente',
								message : validation
							});	
						},
						function(){
							$form.find('.input, .submit').removeClass('courtain disable').prop('disabled',false);
						});
					}
				);
			}
		})
		.on('send','#formuser',function(){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var $form = $(this);
			var $submit = $form.find('.submit');
			user.login = $form.find('#us').val().toLowerCase();
			user.password = ($form.find('#upw').val()) ? $.md5($form.find('#upw').val()) : '';
			if (client.code && client.password){
				var data = {
					'exec': 'authUser',
					'in': client.install,
					'cid': client.code,
					'us': user.login,
					'pw': user.password
				};
				$form.find('.input, .submit').addClass('courtain disable').prop('disabled',true);
				mobserv.sqlite.query(
					'select * from sl_users where login = "'+user.login+'"',
					function(res){
						mobserv.auth.user(res,data,function(validation){
							$('.footer').transition({ y:0 }, 300);
							mobserv.nav.toView('home');
							$form.find('.input, .submit').removeClass('courtain');
							$form.find('.input').val('');
							mobserv.notify.open({
								type : 'info',
								name : 'Autenticação de Usuário',
								message : validation
							});	
							mobserv.services.init(function(){
								mobserv.services.get();
							});
						},
						function(){
							$form.find('.input, .submit').removeClass('courtain disable').prop('disabled',false);
						});
					}
				);
			} else {
				mobserv.notify.open({
					type : 'error',
					name : 'Formulário',
					message : 'Os campos são requiridos'
				});	
			}
		})
		.on('input','.view:visible .search #search',function(){
			var $field = $(this);
			var $form = $field.parent();
			var $ul = $form.next('.list');
			var $li = $ul.children('li');
			var s = $field.val().toLowerCase();
			if ($li.length) {
				if (s == ''){
					$li.removeClass('found').show();
				} else {
					$li.removeClass('found');
					var xml = mobserv.globals.services.xml;
					if (xml){
						var $xml = $(xml);
						if ($form.data('target') == 'service'){
							$search = $xml.find('service');
						} else if ($form.data('target') == 'job'){
							$search = $xml.find('job');
						} else {
							$search = $xml.find('job');
						}
						if ($search.length){
							$search.each(function(){
								var $s = $(this);
								$s.children('layout').each(function(){
									var $l = $(this);
									if ($l.text().toLowerCase().indexOf(s) > -1){
										$li.children('.link[data-id="'+$s.attr('id')+'"]').parent().addClass('found').show();
										return false;
									}
								});
							});
							$li.filter(':not(.found)').hide();
						}
					}
				}
			}
		})
		.on('send','#jobdetails:visible .jobform',function(event,data){
			console.log('formdata',event,data);
			var $form = $(this);
			var $view = $form.closest('.view').addClass('courtain');
			var $section = $view.find('.section').hide();
			data.isPost = true;
			mobserv.services.post(data,function(){
				$view.removeClass('courtain');
				$section.show();
			});
		})
		.on('tap','#formuser .logoutclient',function(){
			mobserv.nav.toView('formclient');
		})
		.on('tap','.input:not(:disabled)',function(){
			$(this).focus().removeClass('invalid');
			event.preventDefault();
			event.stopPropagation();
		})
		.on('change input','.input:not(:disabled)',function(){
			$(this).removeClass('invalid');
		})
		.on('tap','form.search',function(){
			$(this).find('.input').prop('disabled',false).focus();
		})
		.on('blur focusout','.search .input',function(){
			$(this).prop('disabled',true);
		})
		/*
		.on('swiperight','.view:not(.disable)',function(){
			$(this).find('.menu').trigger('tap');
		})
		.on('swipeleft','.view.disable',function(){
			$(this).find('.menu').trigger('tap');
		})
		.on('tap','button.disable, .button.disable, .submit.disable',function(event){
			event.preventDefault();
			return false;
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
		.on('tap','.view:not(.disable) section a, .view:not(.disable) form .link, .view:not(.disable) section .link, .view:not(.disable) header .link, footer .link, .overall button',function(){
			var $this = $(this).addClass('hover');
			mobserv.nav.link($this);
		})
		.on('tap','.overall button',function(){
			var $this = $(this).addClass('hover');
			var $view = $this.closest('.view');
			mobserv.nav.close($view);
		})
		.on('tap','.view:not(.disable) .menu',function(){
			var $this = $(this).addClass('hover');
			if (!$('#nav').hasClass('active')){
				$('.footer').transition({ y:'50px' }, 300);
				$('#nav').addClass('active');
				$('.view.current').addClass('disable').transition({ x:'80%' }, 300).find(".header, .section").transition({ opacity:.3 }, 400);
			}
		})
		.on('tap','.view.disable',function(){
			if ($('#nav').hasClass('active')){
				$('.footer').transition({ y:0 }, 300);
				$('.view.current').transition({ x:0 }, 300,function(){
					$('.view.disable').removeClass('disable');
					$('#nav').removeClass('active');
				}).find(".header, .section").transition({ opacity:1 }, 300);
			}
		})
		.on('touchstart','.view.current .pullarea',function(event){
			startX = event.originalEvent.touches[0].pageX;
			startY = event.originalEvent.touches[0].pageY;
			$pullarea = $(this);
			$pullinfo = $pullarea.prev().removeClass('courtain').find('strong').text('Solte para atualizar');
		})
		.on('touchmove','.view.current .pullarea',function(event){
			endX = event.originalEvent.touches[0].pageX;
			endY = event.originalEvent.touches[0].pageY;
			var $section = $pullarea.parent();
			if ($pullarea.data('moved') != 'u' && $section.scrollTop() < 5 && endY > startY + 15){
				event.preventDefault();
				event.stopPropagation();
				$section.scrollTop(0).addClass('noscroll');
				var val = parseInt((endY-startY)/2.3);
				var h = $(window).height()/4;
				$pullarea.css({'transform': 'translate(0px, '+val+'px)'}).data('moved','y');
				$pullinfo.css({
					transform: 'translate(0px, '+(val/2)+'px)', 
					opacity:val/h
				});
			}
		})		
		.on('touchend','.view.current .pullarea',function(event){
				var $section = $pullarea.parent();
				$section.removeClass('noscroll');
				if ($pullarea.data('moved') == 'y'){
					$pullarea.data('moved','u');
					event.preventDefault();
					event.stopPropagation();
					if (startY+($(window).height()/3) > endY){
						$pullarea.transition({ y:0 }, 300, function(){ $pullarea.data('moved',''); });
						$pullinfo.transition({ y:0, opacity:0 }, 300);
					} else {
						$pullarea.transition({ y:40 }, 300,function(){
							$pullinfo.parent().addClass('courtain');
							$pullinfo.text('Atualizando...');
							$pullarea.trigger('pull');
						});
						$pullinfo.transition({ y:20, opacity:1 }, 300);
					}
				}
				startX = null;
				startY = null;
				endX = null;
				endY = null;
		})		
		.on('pull','.view .pullarea',function(event){
			mobserv.services.get(function(){
				$pullarea.data('moved','');
				$pullarea.transition({ y:0 }, 300);
				$pullinfo.transition({ y:0, opacity:0 }, 300);
				$pullinfo.parent().removeClass('courtain');
				$pullinfo.text('Concluído');
				$pullarea = null;
				$pullinfo = null;
			});
		})
		.on('show','.view',function(){
			var $this = $(this);
			if (mobserv.history.length == 0){
				$this.find('.header .back').hide();
			} else {
				$this.find('.header .back').show();
			}
		})
		.on('show','#formuser',function(){
			var $this = $(this);
			$('.footer').transition({ y:'50px' }, 300);
			mobserv.auth.logout('user');
			$this.find('button, .button, .submit, .input').removeClass('courtain disable').prop('disabled',false);
			$this.find('.input').val('');
		})
		.on('show','#formclient',function(){
			var $this = $(this);
			$('.footer').transition({ y:'50px' }, 300);
			mobserv.auth.logout();
			$this.find('button, .button, .submit, .input').removeClass('courtain disable').prop('disabled',false);
			$this.find('.input').val('');
		})
		.on('show','#datasource',function(){
			var $this = $(this);
			var cache = '', response = '', xml = '';
			if ($this.data('source') == 'service'){
				if (mobserv.globals.services.cache) cache = new XMLSerializer().serializeToString(mobserv.globals.services.cache);
				if (mobserv.globals.services.response) response = new XMLSerializer().serializeToString(mobserv.globals.services.response);
				if (mobserv.globals.services.xml) xml = new XMLSerializer().serializeToString(mobserv.globals.services.xml);
			} else if ($this.data('source') == 'user'){
				if (mobserv.globals.user.cache) cache = new XMLSerializer().serializeToString(mobserv.globals.user.cache);
				if (mobserv.globals.user.response) response = new XMLSerializer().serializeToString(mobserv.globals.user.response);
				if (mobserv.globals.user.xml) xml = new XMLSerializer().serializeToString(mobserv.globals.user.xml);
			} else if ($this.data('source') == 'client'){
				if (mobserv.globals.client.cache) cache = new XMLSerializer().serializeToString(mobserv.globals.client.cache);
				if (mobserv.globals.client.response) response = new XMLSerializer().serializeToString(mobserv.globals.client.response);
				if (mobserv.globals.client.xml) xml = new XMLSerializer().serializeToString(mobserv.globals.client.xml);
			}
			$this.find('#header .icon-code').html($this.data('source'));
			$this.find('code.xml').each(function(i, block) {
				var $sc = $(block);
				if ($sc.hasClass('cache')) $sc.text(cache); 
				else if ($sc.hasClass('response')) $sc.text(response);
				else $sc.text(xml);
				hljs.highlightBlock(block);
			});
		})
		.on('show','#joblist',function(){
			var $this = $(this).addClass('courtain');
			$this.find('.section').hide();
			mobserv.services.cleardom('joblist');
		})
		.on('current','#joblist',function(){
			var $this = $(this).removeClass('courtain');
			mobserv.services.parsedom('joblist',$this.data('id'));
			$this.find('.section').fadeIn(200);
		})
		.on('show','#jobdetails',function(){
			var $this = $(this).addClass('courtain');
			$this.find('.section').hide();
			mobserv.services.cleardom('jobdetails');
		})
		.on('current','#jobdetails',function(){
			var $this = $(this).removeClass('courtain');
			mobserv.services.parsedom('jobdetails',$this.data('id'));
			$this.find('.section').fadeIn(200);
		})
		.on('current','#gps',function(){
			mobserv.geolocation.getPosition();
		})
		.on('current','#map',function(){
			mobserv.geolocation.watchPosition({
				enableHighAccuracy : true,
				timeout : 10000,
				maximumAge : 60000
			});
			var $this = $(this);
			var $locbtn = $this.find('.item.location');
			var $mapdata = $this.find('.mapdata');
			var id = $this.data('id');
			var src = $this.data('source');
			var markersvalue = [];
			var markersevents = {};
			var center = [mobserv.geolocation.position.latitude,mobserv.geolocation.position.longitude];
			var services = mobserv.globals.services;
			var autofit = '';
			var zoom = 10;
			var $jobs = [];
			if (id && src == 'joblist'){
				$jobs = $(services.xml).find('service[id="'+id+'"] > job');
				$mapdata.hide();
			} else if (id && src == 'jobdetails'){
				services = mobserv.globals.services;
				$jobs = $(services.xml).find('job[id="'+id+'"]');
				$mapdata.hide();	
			} else if (src == 'gps') {
				$locbtn.addClass('hilite');	
				$mapdata.show();
				zoom = 16;	
			}
			function icon(image,sx,sy,cx,cy,ax,ay){
				return new google.maps.MarkerImage(
					image, 
					new google.maps.Size(sx,sy), 
					new google.maps.Point(cx,cy), 
					new google.maps.Point(ax,ay)
				);
			}
			markersvalue.push({latLng:center, tag:"mydevice", events:{ click:function(){$('.mapdata').trigger('tap');}}, options:{icon: icon("pic/marker-mobserv.png",30,30,0,0,15,15),zIndex:9,iconSize: [60,60]}});
			var circle = {
				options:{
					center: center,
					radius : 1000,
					fillColor : "#F30",
					fillOpacity : 0.2,
					strokeColor : "#F30",
					strokeOpacity : 0
				}
			}
			if ($jobs.length){
				$jobs.each(function(){
					var $this = $(this);
					var $location = $this.children('location:eq(0)');
					var job = $this.attr('id');
					if ($location.length){
						if ($location.attr('type') == 'geoposition'){
							var lat = parseFloat($location.attr('lat'));
							var lng = parseFloat($location.attr('lng'));
							if (lat && lng){
								if (src == 'joblist'){
									autofit = 'autofit';
								} else if (src == 'jobdetails'){
									center = [lat,lng];
								}
								markersvalue.push({latLng:[lat,lng], data:job, options:{icon:icon("pic/marker-333333.png",30,30,0,0,15,15)}});
							}
						} else if ($location.attr('type') == 'address'){
							markersvalue.push({address:$location.text(), data:job, options:{icon:icon("pic/marker-333333.png",30,30,0,0,15,15)}});
						}
					}
				});
			}
			var map = {
				options:{
					center : center,
					zoom : zoom,
					mapTypeControl: false,	
					navigationControl: false,
					streetViewControl: false,
					scaleControl: false,
					zoomControl: false,
					rotateControl: false,
					scrollwheel: false,
					/*
					styles : [{
						stylers: [
						  { hue: "#00ffe6" },
						  { saturation: -20 }
						]
					},{
						featureType: "road",
						elementType: "geometry",
						stylers: [
						  { lightness: 100 },
						  { visibility: "simplified" }
						]
					},{
						featureType: "road",
						elementType: "labels",
						stylers: [
						  { visibility: "off" }
						]
					}]
					*/
				},
				events:{
					dragstart : function(){
						$locbtn.removeClass('hilite');
					}	
				}
			}
			var marker = {
				values : markersvalue	
			}
			var styledmaptype = {  
				id:"noplaces",
				styles:[{  
					featureType:"poi",
					stylers:[{  
						  visibility:"off"
					   }]
				 }],
				callback:function() {  
					$(".map").gmap3("get").setMapTypeId("noplaces");
				}
			}
			$(".map").gmap3({map:map,marker:marker,circle:circle,styledmaptype:styledmaptype},autofit);			
		})
		.on('hide','#map',function(){
			mobserv.geolocation.clearWatch();
			$('.map').gmap3('destroy');
			$(this).find('.item.location').removeClass('hilite');
		})
		.on('tap','#map .location',function(){
			var $this = $(this);
			mobserv.geolocation.panMap(true);
			$this.addClass('hilite');
		})
		.on('tap','.mapdata',function(){
			$this = $(this);
			if ($this.is(':visible')) $this.hide();
			else $this.show();
		})
	;
	
	
	
	window.addEventListener("error", function(event){
		mobserv.log({
			type : 'error',
			name : 'JS',
			title : 'javascript error on '+event.filename+' ('+event.lineno+', '+event.colno+')',
			message : event.message,
		});	
		return false;
	}, false);
	document.addEventListener("offline", function(){
		$('.statustripe').addClass('orange').fadeIn();
	}, false);
	document.addEventListener("online", function(){
		$('.statustripe').removeClass('orange').delay(1000).fadeOut();
		$.each(mobserv.server.queue||[],function(c,cfg){
			mobserv.server.ajax(cfg);
			mobserv.log({
				type : 'notice',
				name : 'server.ajax.queue',
				message : 'requests from queue triggered'
			});
			return false;	
		})
	}, false);
	document.addEventListener("deviceready", function(){
		mobserv.debug.on();
		mobserv.device.init();
		mobserv.notification.init();
		mobserv.geolocation.autoPosition();
		//mobserv.bgmode.init();
		mobserv.sqlite.init();
		mobserv.auth.init();
		document.addEventListener("backbutton", function(event){
			event.preventDefault();
			if (mobserv.history.length > 0)	$(".view.current .back, .view.current .close").trigger("tap");
			else mobserv.nav.foreground('confirmexit');
		}, false);
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
					message : 'the device will sleep in a while'
				});
			}
		);
		var bgmodeInt;
		cordova.plugins.backgroundMode.enable();
		cordova.plugins.backgroundMode.onactivate = function(){
			mobserv.log({
				type : 'notice',
				name : 'backgroundMode.onactivate',
				message : 'the background mode is active'
			});
			bgmodeInt = setInterval(function(){
				mobserv.log({
					type : 'info',
					name : 'backgroundMode.onactivate',
					message : 'the background mode is rolling'
				});
			},10000);
		}
		cordova.plugins.backgroundMode.ondeactivate = function(){
			mobserv.log({
				type : 'notice',
				name : 'backgroundMode.ondeactivate',
				message : 'the background mode is inactive'
			});
			clearInterval(bgmodeInt);
		}
		cordova.plugins.backgroundMode.onfailure  = function(){
			mobserv.log({
				type : 'error',
				name : 'backgroundMode.onfailure',
				message : 'the background mode trigger error'
			});
			clearInterval(bgmodeInt);
		}
	}, false);
	
	setTimeout(function(){
		if (!mobserv.device.ready){
			mobserv.debug.on();
			mobserv.device.init();
			mobserv.geolocation.autoPosition();
			mobserv.sqlite.init();
			mobserv.auth.init();
		}
		
	},1000);

	
});
