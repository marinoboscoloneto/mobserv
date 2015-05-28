// JavaScript Document


$(function(){
	
	var startX, startY, endX, endY, pull;
	
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
				} else {
					$form.trigger('send');
				}
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
			} else {
				mobserv.notify.open({
					type : 'error',
					name : 'Formulário',
					message : 'Os campos são requiridos'
				});	
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
		.on('tap','#formuser .logoutclient',function(){
			mobserv.nav.toView('formclient');
		})
		.on('tap','.input',function(){
			$(this).focus();
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
				}
			}
			event.preventDefault();
		})
		.on('pull','.view .section',function(event){
			var p = pull;
			mobserv.services.get(function(){
				p.removeClass('courtain');
				p.transition({ height:0 }, 200);
				pull = null;
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
		.on('show','#joblist',function(){
			var $this = $(this);
			mobserv.services.parsedom('joblist',$this.data('id'));
		})
		.on('show','#jobdetails',function(){
			var $this = $(this);
			mobserv.services.parsedom('jobdetails',$this.data('id'));
		})
		.on('show','#gps',function(){
			mobserv.geolocation.watchPosition({
				enableHighAccuracy : true,
				timeout : 10000,
				maximumAge : 60000
			});
		})
		.on('show','#map',function(){
			mobserv.geolocation.watchPosition({
				enableHighAccuracy : true,
				timeout : 10000,
				maximumAge : 60000
			});
			var $this = $(this);
			var $locbtn = $this.find('.item.location');
			var id = $this.data('id');
			var src = $this.data('source');
			var markersvalue = [];
			var center = [mobserv.geolocation.position.latitude,mobserv.geolocation.position.longitude];
			var geopos = {sum:[0,0],len:0};
			var services = mobserv.globals.services;
			var autofit = '';
			var $jobs = [];
			if (id && src == 'joblist'){
				$jobs = $(services.xml).find('service[id="'+id+'"] > job');
			} else if (id && src == 'jobdetails'){
				services = mobserv.globals.services;
				$jobs = $(services.xml).find('job[id="'+id+'"]');
			} else if (src == 'gps') {
				$locbtn.addClass('hilite');	
			}
			if (src != 'jobdetails'){
				geopos.sum[0] += center[0];
				geopos.sum[1] += center[1];
				geopos.len += 1;
			}
			markersvalue.push({latLng:center, tag:"mydevice", options:{icon: "pic/marker-mobserv.png"}});
			if ($jobs.length){
				$jobs.each(function(){
					var $this = $(this);
					var $location = $this.children('location:eq(0)');
					if ($location.length){
						if ($location.attr('type') == 'geoposition'){
							var lat = parseFloat($location.attr('lat'));
							var lng = parseFloat($location.attr('lng'));
							if (lat && lng){
								if (src == 'joblist'){
									geopos.sum[0] += lat;
									geopos.sum[1] += lng;
									geopos.len += 1;
									autofit = 'autofit';
								} else if (src == 'jobdetails'){
									center = [lat,lng];
								}
								markersvalue.push({latLng:[lat,lng], data:"ID "+id, options:{icon: "pic/marker-333333.png"}});
							}
						} else if ($location.attr('type') == 'address'){
							markersvalue.push({address:$location.text(), data:"ID "+id});
						}
					}
				});
			}
			if (geopos.len > 0){
				center = [geopos.sum[0]/geopos.len,geopos.sum[1]/geopos.len];	
			}			
			var map = {
				options:{
					center : center,
					zoom : 12,
					mapTypeControl: false,	
					navigationControl: false,
					streetViewControl: false,
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
					center_changed : function(){
						$locbtn.removeClass('hilite');
					}	
				}
			}
			var marker = {
				values : markersvalue	
			}
			$(".map").gmap3({map:map,marker:marker},autofit);
		})
		.on('hide','#gps, #map',function(){
			mobserv.geolocation.clearWatch();
			$('.map').gmap3('destroy');
		})
		.on('tap','#map .location',function(){
			var $this = $(this);
			mobserv.geolocation.panMap(true);
			$this.addClass('hilite');
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
		mobserv.geolocation.autoPosition();
		//mobserv.bgmode.init();
		mobserv.sqlite.init();
		mobserv.auth.init();
		document.addEventListener("backbutton", function(event){
			event.preventDefault();
			if (mobserv.history.length > 0)	$(".view.current .back, .view.current .close").trigger("tap");
			else mobserv.nav.foreground('confirmexit');
		}, false);
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
