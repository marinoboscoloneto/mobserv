// JavaScript Document


$(function(){
	
	var focusTimeout, holdTimout, multiTouch, startX, startY, endX, endY, pull, $pullarea, $pullinfo;
	
	$(document)
		.on('focus','.input:not(:disabled)',function(){
			mobserv.inputfocus = $(this);
		})
		.on('blur','.input:not(:disabled)',function(){
			mobserv.inputfocus = null;
		})
		.on('submit','form',function(event){
			var $form = $(this);
			var $command = $form.find('.command');
			if ($command.length){
				var cmd = $command.val().toLowerCase();
				var executed = false
				if (cmd == 'debug:on') { mobserv.debug.on(); $command.val(''); executed = true; }
				if (cmd == 'debug:off') { mobserv.debug.off(); $command.val(''); executed = true; }	
				if (cmd == 'sqlite:reset') { mobserv.sqlite.clear(); mobserv.sqlite.create(); $command.val(''); executed = true; }
				if (cmd == 'app:reset') {  mobserv.sqlite.clear(); mobserv.sqlite.create(); location.reload(true); executed = true; }
				if (cmd == 'app:restart' || cmd == 'app:reload') { location.reload(true); executed = true; }
				if (executed) return false;
			}
			var valid = true;
			var formdata = {}
			$form.find('.input:visible:not(:disabled,.disable), input[type="hidden"]:not(:disabled,.disable)').each(function(){
				var $this = $(this);
				formdata[$this.attr('name')] = $this.val();
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
				$form.trigger('send',[formdata]);	
			}
			if(mobserv.inputfocus && !mobserv.inputfocus.data('preventcloseonsubmit')) mobserv.keyboard.close();
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
					'lc': client.license,
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
								mobserv.services.get(function(){
									mobserv.talkies.init(function(){
										mobserv.talkies.get();
									});
								});
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
					if ($form.data('target') == 'service'){
						var xml = mobserv.globals.services.xml;
						var $xml = $(xml);
						$search = $xml.find('service');
					} else if ($form.data('target') == 'job'){
						var xml = mobserv.globals.services.xml;
						var $xml = $(xml);
						$search = $xml.find('job');
					} else if ($form.data('target') == 'message'){
						var xml = mobserv.globals.talkies.xml;
						var $xml = $(xml);
						$search = $xml.find('talk');
					} else {
						return false;
					}
					if (xml && $search.length){
						$search.each(function(){
							var $s = $(this);
							var text = $s.text();
							if (text.toLowerCase().indexOf(s) > -1){
								$li.children('.link[data-id="'+$s.attr('id')+'"]').parent().addClass('found').show();
							}
						});
						$li.filter(':not(.found)').hide();
					}
				}
			}
		})
		.on('send','#jobdetails:visible .jobform',function(event,data){
			var $form = $(this);
			var $view = $form.closest('.view').addClass('courtain');
			var $section = $view.find('.section').hide();
			data.isPost = true;
			mobserv.services.post(data,function(){
				$view.removeClass('courtain');
				$section.show();
			});
		})
		.on('send','#messages:visible .composer',function(event,data){
			var $form = $(this);
			var $view = $form.closest('.view');
			var $chat = $form.prev('.forchat').find('.chat:eq(0)');
			if (data.message){
				$form.find('.input').val('');
				var post = {
					message : {
						id : $.md5(mobserv.now('timestamp')+mobserv.device.data.uuid+$view.data('id')+data.message),
						text : data.message,
						talk : $view.data('id')
					},
					isPost : true,
					exec : 'postTalkieMessage'
				}
				var $html = ''+
				'<div class="talk me courtain" id="'+post.message.id+'">'+
					'<div class="text">'+post.message.text+'</div>'+
					'<div class="info"><span class="icon-clock">'+mobserv.now('time')+'</span></div>'+
				'</div>'+
				'<div class="clear"></div>';
				$html = $($html);
				$chat.append($html.css({opacity:0,transform:'scale(0.1,0.1)'}));
				$form.prev('.forchat').scrollTop(999999999);
				$html.transition({opacity:1,scale:1.1},200,function(){ $html.transition({scale:1},150); });
				mobserv.talkies.post(post,
					function(){
						$html.removeClass('courtain');
					},
					function(){
						$html.removeClass('courtain').addClass('error');
					}
				);
				
			}
		})
		.on('tap','#messages:visible .composer .submit',function(event,data){
			var $form = $(this).closest('form');
			$form.submit();
			event.preventDefault();
			event.stopPropagation();
		})
		.on('tap','#confirmexit .exit',function(){
			mobserv.exit();
		})
		.on('tap','#formuser .logoutclient',function(){
			mobserv.nav.toView('formclient');
		})
		.on('tap','#formclient .input:not(:disabled), #formuser .input:not(:disabled)',function(event){
			var $input = $(this);
			$input.focus().removeClass('invalid');
			event.preventDefault();
			event.stopPropagation();
		})
		.on('tap','.input:not(:disabled)',function(event){
			var $input = $(this);
			$input.focus().removeClass('invalid');
			//event.preventDefault();
			//event.stopPropagation();
		})
		.on('change input','.input:not(:disabled)',function(){
			$(this).removeClass('invalid');
		})
		.on('tap','form.search, form.composer',function(){
			var $form = $(this);
			$form.find('.input').prop('disabled',false).focus();
		})
		.on('blur focusout','.search .input, .composer .input',function(){
			var $this = $(this);
			setTimeout(function(){
				$this.prop('disabled',true);
			},300);
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
				$('.view.current').addClass('disable').transition({ x:'-80%' }, 300).find(".header, .section").transition({ opacity:.3 }, 300);
			}
		})
		.on('tap','#confirmremovelog button.remove',function(){
			mobserv.unlog();
		})
		.on('tap','#confirmremovemessages button.remove',function(){
			var $this = $(this);
			var $view = $this.closest('.view');
			mobserv.talkies.remove($view.data('id'));
		})
		.on('tap','#confirmmasterreset button.remove',function(){
			mobserv.sqlite.clear();
			mobserv.sqlite.create();
			$('#main > *').hide();
			$('#main').addClass('courtain');
			setTimeout(function(){
				location.reload(true);
			},2000);
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
		.on('tap','#messages .chat',function(){
			mobserv.keyboard.close();
		})
		/*
		.on('touchstart',function(event){
			if (event.originalEvent.touches.length == 2){
				holdTimout = setTimeout(function(){
					if(mobserv.debug.active){
						mobserv.debug.off();
					} else {
						mobserv.debug.on();	
					}
				},3000);
			} else if (event.originalEvent.touches.length == 3){
				holdTimout = setTimeout(function(){
					mobserv.sqlite.clear(); mobserv.sqlite.create(); location.reload(true);
				},3000);
			}
		})
		.on('touchmove',function(event){
			if (holdTimout) clearTimeout(holdTimout);
		})
		.on('touchend',function(event){
			if (holdTimout) clearTimeout(holdTimout);
		})
		*/
		.on('touchstart','.view.current .pullarea',function(event){
			if (event.originalEvent.touches.length == 1){
				startX = event.originalEvent.touches[0].pageX;
				startY = event.originalEvent.touches[0].pageY;
				$pullarea = $(this);
				if ($pullarea.data('moved') != 'u'){
					$pullinfo = $pullarea.prev().removeClass('courtain').find('strong').text('Solte para atualizar');
				}
			}
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
				if ($pullarea.data('moved') == 'y'){
					$pullarea.data('moved','u');
					event.preventDefault();
					event.stopPropagation();
					if (startY+($(window).height()/2) > endY){
						$pullarea.transition({ y:0 }, 250, function(){ $pullarea.data('moved',''); });
						$pullinfo.transition({ y:0, opacity:0 }, 250);
					} else {
						$pullarea.transition({ y:40 }, 250,function(){
							$pullinfo.parent().addClass('courtain');
							$pullinfo.text('Atualizando...');
							$pullarea.trigger('pull');
						});
						$pullinfo.transition({ y:20, opacity:1 }, 250);
					}
				}
				startX = null;
				startY = null;
				endX = null;
				endY = null;
		})		
		.on('pull','.view#home .pullarea',function(event){
			var $section = $pullarea.parent();
			mobserv.services.get(function(){
				mobserv.talkies.get(function(){
					$pullarea.data('moved','');
					$pullarea.transition({ y:0 }, 300);
					$pullinfo.transition({ y:0, opacity:0 }, 300, function(){$section.removeClass('noscroll');});
					$pullinfo.parent().removeClass('courtain');
					$pullinfo.text('Concluído');
					$pullarea = null;
					$pullinfo = null;
				});
			});
		})
		.on('pull','.view#servicelist .pullarea, .view#joblist .pullarea',function(event){
			var $section = $pullarea.parent();
			mobserv.services.get(function(){
				$pullarea.data('moved','');
				$pullarea.transition({ y:0 }, 300);
				$pullinfo.transition({ y:0, opacity:0 }, 300, function(){$section.removeClass('noscroll');});
				$pullinfo.parent().removeClass('courtain');
				$pullinfo.text('Concluído');
				$pullarea = null;
				$pullinfo = null;
			});
		})
		.on('pull','.view#talkies .pullarea',function(event){
			var $section = $pullarea.parent();
			mobserv.talkies.get(function(){
				$pullarea.data('moved','');
				$pullarea.transition({ y:0 }, 300);
				$pullinfo.transition({ y:0, opacity:0 }, 300, function(){$section.removeClass('noscroll');});
				$pullinfo.parent().removeClass('courtain');
				$pullinfo.text('Concluído');
				$pullarea = null;
				$pullinfo = null;
			});
		})
		.on('pull','.view#messages .pullarea',function(event){
			var $section = $pullarea.parent();
			mobserv.talkies.get(function(){
				$pullarea.data('moved','');
				$pullarea.transition({ y:0 }, 300);
				$pullinfo.transition({ y:0, opacity:0 }, 300, function(){$section.removeClass('noscroll');});
				$pullinfo.parent().removeClass('courtain');
				$pullinfo.text('Concluído');
				$pullarea = null;
				$pullinfo = null;
			});
		})
		.on('show','.view',function(){
			var $this = $(this);
			mobserv.keyboard.close();
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
			} else if ($this.data('source') == 'talkies'){
				if (mobserv.globals.talkies.cache) cache = new XMLSerializer().serializeToString(mobserv.globals.talkies.cache);
				if (mobserv.globals.talkies.response) response = new XMLSerializer().serializeToString(mobserv.globals.talkies.response);
				if (mobserv.globals.talkies.xml) xml = new XMLSerializer().serializeToString(mobserv.globals.talkies.xml);
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
		.on('show','#messages',function(){
			var $this = $(this).addClass('courtain');
			$this.find('.section').hide();
			mobserv.talkies.cleardom('messages');
			mobserv.talkies.read($this.data('id'));
		})
		.on('current','#messages',function(){
			var $this = $(this).removeClass('courtain');
			mobserv.talkies.parsedom('messages',$this.data('id'));
			$this.find('.section').fadeIn(200).scrollTop(999999999);
			mobserv.talkies.autogetspeed = 0.1;
			mobserv.talkies.autoreset();
		})
		.on('hide','#messages',function(){
			mobserv.talkies.autogetspeed = 1;
			mobserv.talkies.autoreset();
		})
		.on('current','#gps',function(){
			mobserv.geolocation.getPosition();
		})
		.on('show','#map',function(){
			var $this = $(this);
			$this.find('.mapdata').hide();
			$this.find('.jobdata').hide();
		})
		.on('current','#map',function(){
			var $this = $(this);
			var $locbtn = $this.find('.item.location');
			var $mapdata = $this.find('.mapdata').hide();
			var $jobdata = $this.find('.jobdata').hide();
			var id = $this.data('id');
			var src = $this.data('source');
			var services = mobserv.globals.services;
			var lat = mobserv.geolocation.position.latitude;
			var lng = mobserv.geolocation.position.longitude;
			var zoom = 10;
			var $route = null;
			var route = []
			var $service = [];
			var $jobs = [];
			var hasmap = mobserv.bing.has('bingmap');
			var bounds = [[lat,lng]];
			if (id && src == 'joblist'){
				$service = $(services.xml).find('service[id="'+id+'"]');
				$jobs = $service.children('job');
				$route = $service.children('route');
			} else if (id && src == 'jobdetails'){
				services = mobserv.globals.services;
				$jobs = $(services.xml).find('job[id="'+id+'"]');
				$service = $jobs.parent();
				$route = $service.children('route');
			} else if (src == 'gps') {
				$locbtn.addClass('hilite');	
				zoom = 16;	
			}
			mobserv.bing.load('bingmap',lat,lng,zoom,function(){
				if (!mobserv.bing.forcepam){
					$('.view#map .item.location').removeClass('hilite');
				}
				mobserv.bing.forcepam = false;
			});
			mobserv.bing.me(lat,lng,function(){$('.mapdata').trigger('tap');});
			mobserv.bing.pin.remove();
			mobserv.bing.line.remove();
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
								if (!hasmap){
									bounds.push([lat,lng]);
								}
								var name = $this.find('layout[name="screenName"]').text();
								var num = $this.find('layout[name="indentifierNumber"]').text();
								var color = $this.find('layout[name="indentifierColor"]').text();
								//mobserv.bing.pin.location(job,lat,lng,'pic/marker-333333.png',function(){ $('.jobdata').trigger('pick',[$this]); });
								//mobserv.bing.pin.box(job,lat,lng,10,10,'',function(){ $('.jobdata').trigger('pick',[$this]); });
								mobserv.bing.pin.circle(job,lat,lng,20,color,num,function(){ $('.jobdata').trigger('pick',[$this]); });
								mobserv.bing.pin.box(job+'box',lat,lng,40,20,'<div style="font-weight:bold; color:'+((color)?color:'#000')+'; font-size:8px; width:80px; text-align:center;">'+((name)?name:job)+'</div>');
								if ($route.length) route.push([lat,lng]);
							}
						} else if ($location.attr('type') == 'address'){
							mobserv.bing.pin.address(job,$location.text(),'pic/marker-333333.png',function(){ $('.jobdata').trigger('pick',[$this]); });
							mobserv.bing.pin.box(job+'box',lat,lng,'REM '+job);
						}
					}
				});
				if ($route.length) mobserv.bing.line.add('route'+id,route,$route.attr('color'),$route.attr('stroke'),$route.attr('alpha'));
			}
			if (!hasmap) mobserv.bing.bounds('bingmap',bounds);
			mobserv.geolocation.watchPosition({
				enableHighAccuracy : true,
				timeout : 10000,
				maximumAge : 60000
			});
		})
		.on('tap','#map .location',function(){
			var $this = $(this);
			mobserv.bing.pam(true);
			$this.addClass('hilite');
		})
		.on('tap','.mapdata',function(){
			$this = $(this);
			var $view = $this.closest('.view');
			$view.find('.jobdata').hide();
			if ($this.is(':visible')) $this.hide();
			else $this.show();
		})
		.on('tap','.jobdata',function(){
			$this = $(this);
			var $view = $this.closest('.view');
			$view.find('.mapdata').hide();
			if ($this.is(':visible')) $this.hide();
			else $this.show();
		})
		.on('pick','.jobdata',function(event,$job){
			var $this = $(this);
			var $view = $this.closest('.view');
			var $table = $this.show().find('table');
			var $layout = $job.children('layout[name="detail"]');
			var $location = $job.children('location');
			var name = $job.find('layout[name="screenName"]').text();
			var color = $job.find('layout[name="indentifierColor"]').text();
			$view.find('.mapdata').hide();
			$this.show();
			if ($layout.length){
				$table.prev('h2').css('color',(color)?color:'#333').text((name)?htmldecode(name):'Dados do Ponto');
				$table.html('');
				$layout.each(function(){
					var $this = $(this);
					$table.append('<tr><td width="25%">'+$this.attr('label')+'</td><td><small><b>'+htmldecode($this.text())+'</b></small></td></tr>');
				});
				var $options = $('<tr><td width="100%" colspan="2" style="text-align:center; padding:10px 0 4px 0;" class="options"></td></tr>').appendTo($table);
				$options = $options.find('td');
				$options.append('<a class="details" style="background:'+((color)?color:'#333')+'">Detalhes</a>');
				$options.find('.details').on('tap',function(event){
					$('#joblist .list .link[data-id="'+$job.attr('id')+'"]').trigger('tap');
				});
				if ($location.length){
					$options.append('<a class="navigate">Navegar até aqui</a>');
					$options.find('.navigate').on('tap',function(event){
						var pos = mobserv.geolocation.position;
						launchnavigator.navigate(
							($location.attr('type') == 'geoposition') ? [$location.attr('lat'), $location.attr('lng')] : $location.text(),
							null,
							function(){
								mobserv.log({
									type : 'notice',
									name : 'launchnavigator.navigate',
									message : 'launchnavigator has called successful'
								});	
							},
							function(error){
								mobserv.log({
									type : 'error',
									name : 'launchnavigator.navigate',
									message : error
								});	
							},{ 
								preferGoogleMaps: true
							}
						);
					});
				}
			}
			$this.find('#jobid').append($job.attr('id'))
			$this.find('#jobid').text($job.attr('id'))
		})
		/*
		.on('current','#map',function(){
			mobserv.geolocation.watchPosition({
				enableHighAccuracy : true,
				timeout : 10000,
				maximumAge : 60000
			});
			var $this = $(this);
			var $locbtn = $this.find('.item.location');
			var $mapdata = $this.find('.mapdata');
			var $jobdata = $this.find('.jobdata');
			var id = $this.data('id');
			var src = $this.data('source');
			var markersvalue = [];
			var markersevents = {};
			var center = [mobserv.geolocation.position.latitude,mobserv.geolocation.position.longitude];
			var services = mobserv.globals.services;
			var autofit = '';
			var zoom = 10;
			var $jobs = [];
			$mapdata.hide();
			$jobdata.hide();
			if (id && src == 'joblist'){
				$jobs = $(services.xml).find('service[id="'+id+'"] > job');
			} else if (id && src == 'jobdetails'){
				services = mobserv.globals.services;
				$jobs = $(services.xml).find('job[id="'+id+'"]');
			} else if (src == 'gps') {
				$locbtn.addClass('hilite');	
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
								markersvalue.push({latLng:[lat,lng], data:job, events:{ click:function(){$('.jobdata').trigger('pick',[$this]);}}, options:{icon:icon("pic/marker-333333.png",30,30,0,0,15,15)}});
							}
						} else if ($location.attr('type') == 'address'){
							markersvalue.push({address:$location.text(), data:job, events:{ click:function(){$('.jobdata').trigger('pick',[$this]);}}, options:{icon:icon("pic/marker-333333.png",30,30,0,0,15,15)}});
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
					styles : [ { "featureType": "landscape", "stylers": [ { "saturation": -100 }, { "visibility": "simplified" } ] },{ "featureType": "road", "elementType": "geometry.stroke", "stylers": [ { "visibility": "on" }, { "saturation": -100 }, { "lightness": -18 } ] },{ "featureType": "poi", "stylers": [ { "saturation": -100 } ] },{ "featureType": "landscape.man_made", "stylers": [ { "visibility": "off" } ] } ]
				},
				events:{
					dragstart : function(){
						$locbtn.removeClass('hilite');
					}	
				}
			}
			console.log(map);
			var marker = {
				values : markersvalue	
			}
			$(".map").gmap3({map:map,marker:marker,circle:circle},autofit);			
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
			var $view = $this.closest('.view');
			$view.find('.jobdata').hide();
			if ($this.is(':visible')) $this.hide();
			else $this.show();
		})
		.on('tap','.jobdata',function(){
			$this = $(this);
			var $view = $this.closest('.view');
			$view.find('.mapdata').hide();
			if ($this.is(':visible')) $this.hide();
			else $this.show();
		})
		.on('pick','.jobdata',function(event,$job){
			var $this = $(this);
			var $view = $this.closest('.view');
			var $table = $this.show().find('table');
			var $layout = $job.children('layout[name="detail"]');
			var $location = $job.children('location');
			$view.find('.mapdata').hide();
			$this.show();
			if ($layout.length){
				$table.html('');
				$layout.each(function(){
					var $this = $(this);
					$table.append('<tr><td width="25%">'+$this.attr('label')+'</td><td><small><b>'+htmldecode($this.text())+'</b></small></td></tr>');
				});
				if ($location.length){
					$table.append('<tr><td width="25%" colspan="2" style="text-align:center;"><br><a class="navigate">Navegar até aqui</a></td></tr>');
					$table.find('.navigate').on('tap',function(){
						var pos = mobserv.geolocation.position;
						launchnavigator.navigate(
							($location.attr('type') == 'geoposition') ? [$location.attr('lat'), $location.attr('lng')] : $location.text(),
							[pos.latitude, pos.longitude],
							function(){
								mobserv.log({
									type : 'notice',
									name : 'launchnavigator.navigate',
									message : 'launchnavigator has called successful'
								});	
							},
							function(error){
								mobserv.log({
									type : 'error',
									name : 'launchnavigator.navigate',
									message : error
								});	
							}
						);
					});
				}
			}
			
			$this.find('#jobid').append($job.attr('id'))
			$this.find('#jobid').text($job.attr('id'))
		})
		*/
		;
		$('.section').on('scroll',function() {
			var $this = $(this);
			if($this.scrollTop() + $this.innerHeight() >= this.scrollHeight) {
				$this.addClass('scrollend');
        	} else {
				$this.removeClass('scrollend');	
			}
		});
	
	
	window.addEventListener("error", function(event){
		mobserv.log({
			type : 'error',
			name : 'JS',
			title : 'javascript error on '+event.filename+' ('+event.lineno+', '+event.colno+')',
			message : event.message
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
		//mobserv.debug.on();
		mobserv.device.init();
		mobserv.insomnia.init();
		mobserv.battery.init();
		mobserv.keyboard.init();
		mobserv.bgmode.init();
		mobserv.notification.init();
		mobserv.menubutton.init();
		mobserv.backbutton.init();
		mobserv.geolocation.autoPosition();
		mobserv.sqlite.init();
		mobserv.auth.init();
	}, false);
	
	setTimeout(function(){
		if (!mobserv.device.ready){
			mobserv.debug.on();
			mobserv.device.init();
			mobserv.battery.init();
			mobserv.bgmode.init();
			mobserv.geolocation.autoPosition();
			mobserv.sqlite.init();
			mobserv.auth.init();
		}
		
	},1000);

	
});
