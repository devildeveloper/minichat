var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');

var port = process.env.PORT || 3000
var basePath = "http://localhost:1337" ;
/*
app.get('/', function(req, res){
  res.sendfile('index.html');
}); */
io.set('origins', '*:*');

io.on('connection', function(socket){
	console.log('a user connected');

	socket.on('asignTicket',function(userId,ticketId,companyId){
		console.log(userId+' '+companyId+' '+ticketId);
		request(
				{
					method : 'PUT',
					//http://localhost:1337/ticket/1?status=1&employee=2&rank=0
					uri    : basePath+'/ticket/'+ticketId+
							'?status=1&employee='+userId+
							'&rank=0'
				} 
				,function(error,response,body){
					if(error){
						//socket.emit("message_error",error);
						socket.emit('response_message',{err:error,success:false})
					}else if(body.error){
						//socket.emit("message_created",response);
						socket.emit('response_message',{err:body.error,success:false})
					}else{
						socket.broadcast.in(companyId+':1').emit('asignmentTicket',{ticket:ticketId});
					}
				})		
		
	})
	socket.emit('connected',{key:'as'});
	//creando el ticket
	socket.on('create_ticket',function(data){
		//console.log(data);
		//socket.emit('response',data)
		request(
				{
					method : 'POST',
					uri    : basePath+'/api/ticket/create?message='+data.message+
								'&area=1&company='+data.company+
								'&userId='+data.userId+
								'&author='+data.author
				} 
				,function(error,response,body){

					var body =JSON.parse(body);
					if(error){
						socket.emit('response_ticket',{error:error,success:false,ticket:0,company:1})
					}else if(body.error){
						socket.emit('response_ticket',{err:body.error,success:true,ticket:0,company:1})
					}else{
						console.log(body)
						socket.join('ticket:'+body.ticket);
						socket.broadcast.in(data.company+':'+data.area).emit('new_ticket',body);
						socket.emit('response_ticket',{err:0,success:true,ticket:body.ticket,company:1})
						//cb({err:0,success:true,ticket:response,company:1})						
					}
				})
	
	});
	socket.on('send_message',function(message,cb){
		console.log(message)
		request(
				{
					method : 'POST',
					uri    : basePath+'/api/message/movil?body='+message.body+
								'&ticket='+message.ticket+
								'&type='+message.type+
								'&author='+message.author
				} 
				,function(error,response,body){
					if(error){
						//socket.emit("message_error",error);
						socket.emit('response_message',{err:error,success:false})
					}else if(body.error){
						//socket.emit("message_created",response);
						socket.emit('response_message',{err:body.error,success:false})
					}else{
						socket.broadcast.in('ticket:'+message.ticket).emit('new_message',message);
						socket.emit('response_message',{err:0,success:true})
						//socket.emit("message_error",{message:"unknow state"});
					}
				})
	});
	socket.on('send_message_web',function(message,cb){
		io.to('ticket:'+message.ticket).emit('new_message',message);
		cb({err:0,success:true})
	});	
	socket.on('join',function(room,cb){
		console.log(room)
		socket.join(room);
		cb({result:'joined to room '+room});
	})
	socket.on('join_movil',function(room){
		console.log(room)
		socket.join(room);
		socket.emit("response_join",{result:'joined to room ticket:'+room});
	})	
	//disconnect
	socket.on('disconnect',function(socket){
		console.log("user out");
	});	
	socket.on('closeTicket',function(data,cb){
		request({
			method   : 'GET',
			uri      : basePath+'/ticket/closeTicket?ticketId='+data.ticketId
		},function(error,response,body){
			console.log(body)
			if(error){
				cb({error:error,success:0,body:body});
			}else{
				cb({error:error});
				socket.broadcast.in('ticket:'+data.ticketId).emit('close_ticket',{body:'La conversación ha sido finalizada, gracias por comunicarse con nosotros. Para volverse a comunicar solo agregue un nuevo mensaje.',ticket:data.ticketId})

			}
		})
	})

});

http.listen(port, function(){
  console.log('listening on *:'+ port);
});
