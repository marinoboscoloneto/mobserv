// JavaScript Document


$(function(){
	
	var startX, startY, endX, endY, pull;
	
	$(document)
		.on('submit','form',function(event){
			var $form = $(this);
			var $command = $form.find('.command');
			if ($command.length){
				var cmd = $command.val().toLowerCase();
				if (cmd == 'debug:on') { mobserv.debug.on(); $command.val(''); }
				if (cmd == 'debug:off') { mobserv.debug.off(); $command.val(''); }	
			} else {
				$form.find('.submit').trigger('tap');	
			}
			event.preventDefault();
			return false;
		})
		.on('tap','#formclient .submit',function(){
			var client = mobserv.globals.client;
			var $submit = $(this);
			var $form = $submit.closest('form');
			client.Cli_Install = $.md5(mobserv.device.data.uuid);
			client.Cli_Code = $form.find('#cid').val();
			client.Cli_Pw = ($form.find('#cpw').val()) ? $.md5($form.find('#cpw').val()) : '';
			if (client.Cli_Code && client.Cli_Pw){
				var data = {
					'exec': 'getLicense',
					'in': client.Cli_Install,
					'cid': client.Cli_Code,
					'pw': client.Cli_Pw
				};
				$form.find('.input, .submit').addClass('courtain disable').prop('disabled',true);
				mobserv.sqlite.query(
					'select * from sl_clients where Cli_Code = "'+client.Cli_Code+'"',
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
		.on('tap','#formuser .submit',function(){
			var client = mobserv.globals.client;
			var user = mobserv.globals.user;
			var $submit = $(this);
			var $form = $submit.closest('form');
			user.Usr_Login = $form.find('#us').val();
			user.Usr_Pw = ($form.find('#upw').val()) ? $.md5($form.find('#upw').val()) : '';
			if (client.Cli_Code && client.Cli_Pw){
				var data = {
					'exec': 'authUser',
					'in': client.Cli_Install,
					'cid': client.Cli_Code,
					'us': user.Usr_Login,
					'pw': user.Usr_Pw
				};
				$form.find('.input, .submit').addClass('courtain disable').prop('disabled',true);
				mobserv.sqlite.query(
					'select * from sl_users where Usr_Login = "'+user.Usr_Login+'"',
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
		.on('tap','.view:not(.disable) section a, .view:not(.disable) form .link, .view:not(.disable) section .link, .view:not(.disable) header .link, footer .link',function(){
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
		.on('show','#formclient',function(){
			mobserv.auth.logout();
		})
		.on('show','#gps',function(){
			var $this = $(this);
			mobserv.geolocation.watchPosition($this);
		})
		.on('hide','#gps',function(){
			mobserv.geolocation.clearWatch();
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
		$('.statustripe').addClass('red').fadeIn();
		$('button, submit, reset').addClass('disable').prop('disabled',true);
	}, false);
	document.addEventListener("online", function(){
		$('.statustripe').removeClass('red').fadeOut();
		$('button, submit, reset').removeClass('disable').prop('disabled',false);
	}, false);
	document.addEventListener("deviceready", function(){
		mobserv.debug.on();
		mobserv.device.init();
		//mobserv.bgmode.init();
		mobserv.sqlite.init();
		mobserv.auth.init();
	}, false);
	
	setTimeout(function(){
		if (!mobserv.device.ready){
			mobserv.debug.on();
			mobserv.sqlite.init();
			mobserv.auth.init();
		}
		
	},1000);

	
});
