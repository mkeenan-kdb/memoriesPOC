//Lets try vaillaJS!
//Globals
var socket = {};
var numAvailableImages = 0;
var portfolioImages = [0, 1, 2, 3, 4, 5];
var firstLoad = true;
var imgUpload = {date:"",time:"",title:"",loc:"",subjs:"",descr:"",data:""};
var uploadTemplate = imgUpload;
var uploadVisable = false;
var timeout;
var interval;

function getInputVal(elemid){
	return document.getElementById(elemid).value;
}

function fadeOut(elem){
	clearTimeout(timeout);
	elem.style.opacity = "1";
	interval = setInterval(function(elem){
		var newOpacity = (parseFloat(elem.style.opacity))-0.05;
		if(0>newOpacity){
			elem.className = "dialog-container hide";
			elem.style.opcaity = "1.0";
			clearInterval(interval);
		}else{
			elem.style.opacity = newOpacity.toString();
		}
	}, 20, elem);
}

function notifyUser(msgObj){
	//Add message from server to dialog
	var dialog = document.getElementById("dialogContainer");
	var head = document.getElementById("dialogHead");
	var body = document.getElementById("dialogBody");
	dialog.className = "dialog-container";
	dialog.style.opacity = "1";
	head.innerHTML = msgObj.head;
    body.innerHTML = msgObj.body;
    timeout = setTimeout(function(elem){ fadeOut(elem); }, 2000, dialog);
}

function toggleUpload(){
	var uploader = document.getElementById("uploadContainer");
	if(uploadVisable){
		uploader.className = "upload-container hide";
	}else if(!uploadVisable){
		uploader.className = "upload-container";
	}
	uploadVisable = !uploadVisable;
}

function uploadNewImage(){
	toggleUpload();
	var file = document.getElementById("imgFile").files[0];
	imgUpload.fName = file.name;
	imgUpload.date = getInputVal("imgDate");
	imgUpload.time = getInputVal("imgTime");
	imgUpload.title = getInputVal("imgTitle");
	imgUpload.loc = getInputVal("imgLoc");
	imgUpload.descr = getInputVal("imgDesc");
	imgUpload.subjs = getInputVal("imgSubj");
    var reader  = new FileReader();
    reader.onload = function(e) {
	    imgUpload.data = reader.result;
	    toggleServerBusy(true);
    	socket.sendCmd("addNewUpload",[imgUpload]);
  	}
  	reader.readAsDataURL(file);
}

//Status is true or false - overlays the whole page and shows loading icon
function toggleServerBusy(status){
	var overlay = document.getElementById("overlay");
	var spinner = document.getElementById("loader");
	if(status){
		spinner.className = "spinner";
		overlay.className = "cover";
	}else{
		spinner.className = "";
		overlay.className = "";
	}
}

//Get the next 6 images and display in the portfolio
function nextSet(){
	toggleServerBusy(true);
	for(i=0;i<6;i++){
		portfolioImages[i]+=6;
		if(portfolioImages[i]>numAvailableImages){
			portfolioImages[i] = (portfolioImages[i]-numAvailableImages);
		}
		socket.sendCmd("getImage",[i.toString(),portfolioImages[i].toString()]);
	}
}

//Get the precious 6 images and display in the portfolio
function previousSet(){
	toggleServerBusy(true);
	for(i=0;i<6;i++){
		portfolioImages[i]-=6;
		if(portfolioImages[i]<0){
			portfolioImages[i] = (numAvailableImages+portfolioImages[i]);
		}
		socket.sendCmd("getImage",[i.toString(),portfolioImages[i].toString()]);
	}
}

function imgFromBytes(data, elemid){
	// Convert the string to bytes
	var bytes = new Uint8Array(data.length / 2);
	for (var i = 0; i < data.length; i += 2) {
	    bytes[i / 2] = parseInt(data.substring(i, i + 2), 16);
	}
	// Make a Blob from the bytes
	var blob = new Blob([bytes], {type: 'image/jpg'});
	// Use createObjectURL to make a URL for the blob
	var image = new Image();
	image.alt = "portfolio item";
	image.src = URL.createObjectURL(blob);
	return image;
}

function renderPortfolio(data){
	var imgid = Object.keys(data)[0];
	var imgInfo = data[imgid];
	var rawimg = imgInfo.blob;
	var imgElem = imgFromBytes(rawimg, imgid);
	var prevImage = document.querySelector("#"+imgid+" img");
	if(prevImage != null){
		prevImage.remove();
	};
	document.getElementById(imgid).appendChild(imgElem);
	document.querySelector("#"+imgid+" figcaption > h3").innerHTML = imgInfo.title;
	document.querySelector("#"+imgid+" figcaption > p").innerHTML = imgInfo.description;
	if(imgid === "img5"){
		toggleServerBusy(false);
	}
}

//Websocket Stuff and connection
function connect(){
	var socket = {};
	//var ws =  new WebSocket(window.location.origin.replace("http","ws"));
	var ws = new WebSocket("ws://michaels-macbook-air.local:50667")
	ws.binaryType="arraybuffer";
	//Send command to q server helper function
	socket.sendCmd = function(qFunc, qParams){
		window.prevFunc = qFunc;
		window.prevParams = qParams;
		var requestObj = {func:qFunc,params:qParams};
		socket.ws.send(serialize(JSON.stringify(requestObj)));
	}
	//Open websocket - get the 6 most recent pics
	ws.onopen = function(){
		toggleServerBusy(true);
		for(imgid in portfolioImages){
			socket.sendCmd("getImage",[imgid,imgid]);
		}
	}
	//Let the user know when the connection closes
	ws.onclose = function(){
		console.log("Connection to the server has closed");
	}
	//On message - server tells us how to handle the data
	ws.onmessage = function(msg){
		var raw = JSON.parse(deserialize(msg.data));
		var msgType = raw[0];
		var msgData = raw[1];
		switch(msgType){
			case "numImages":
				numAvailableImages = msgData-1;
				break;
			case "notifyUser":
				toggleServerBusy(false);
				notifyUser(msgData);
				break;
			case "renderPortfolio":
				renderPortfolio(msgData);
				if(firstLoad){firstLoad=!firstLoad;window.scrollTo(0,0);};
				break;
			case "Error":
				toggleServerBusy(false);
				alert(msgData);
				break;
			default:
				toggleServerBusy(false);
				console.log("No handler for message type: ",msgType);
		}
	}
	//Push ws to socket and return
	socket.ws = ws;
	return socket;
}

//Initialise webpage
window.onload = function(){
	window.scrollTo(0, 0);
	socket = connect();
};
