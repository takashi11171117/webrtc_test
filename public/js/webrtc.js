window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate;

const socket = io();
let myName = '';
let theirName = '';
let myUserType = '';
const configuration = {
  'iceServers': [{
    url: 'stun:stun.l.google.com:19302'
  }]
};
let pc;
let isNegotiating = false;
const mainVideoArea = document.querySelector("#mainVideoTag");
const smallVideoArea = document.querySelector("#smallVideoTag");
const dataChannelOptions = {
  ordered: false,
  maxRetransmitTime: 1000,
};
let dataChannel;

socket.on('signal', (data) => {
  if (data.user_type == "doctor" && data.command == "joinroom") {
    console.log("The doctor is here!");
    if (myUserType == "patient") {
      theirName = data.user_name;
      document.querySelector("#messageOutName").textContent = theirName;
      document.querySelector("#messageInName").textContent = myName;
    }
    //Switch to the doctor listing
    document.querySelector("#requestDoctorForm").style.display = 'none';
    document.querySelector("#waitingForDoctor").style.display = 'none';
    document.querySelector("#doctorListing").style.display = 'block';
  }
  else if (data.user_type == "patient" && data.command == "calldoctor") {
    console.log("Patient is calling");
    if (myUserType == "doctor") {
      theirName = data.user_name;
      document.querySelector("#messageOutName").textContent = theirName;
      document.querySelector("#messageInName").textContent = myName;
    }
    document.querySelector("#doctorSignup").style.display = 'none';
    document.querySelector("#videoPage").style.display = 'block';
  }
  else if (data.user_type == 'signaling') {
    if (!pc) startSignaling();
    var message = JSON.parse(data.user_data);
    if (message.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
        if (pc.remoteDescription.type == 'offer') {
          pc.createAnswer(sendLocalDesc, logError);
        }
      }, logError);
    }
    else {
    	pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  }
});

function startSignaling() {
  console.log("starting signaling...");
  pc = new RTCPeerConnection(configuration);
  dataChannel = pc.createDataChannel('textMessages', dataChannelOptions);
  
  dataChannel.onopen = dataChannelStateChanged;
  pc.ondatachannel = receiveDataChannel;

  // send any ice candidates to the other peer
  pc.onicecandidate = function (evt) {
    if (evt.candidate) {
      socket.emit(
        'signal',
        {
          user_type: "signaling",
          command: "icecandidate",
          user_data: JSON.stringify({ 'candidate': evt.candidate })
        }
      );
    }
    console.log("completed sending an ice candidate...");
  };

  // let the 'negotiationneeded' event trigger offer generation
  pc.onnegotiationneeded = function () {
    if (isNegotiating) {
        console.log("SKIP nested negotiations");
        return;
    }
    isNegotiating = true;
  	console.log("on negotiation called");
  	pc.createOffer(sendLocalDesc, logError);
  };

  pc.onsignalingstatechange = (e) => {
    isNegotiating = (pc.signalingState != "stable");
  }

  // once remote stream arrives, show it in the main video element
  pc.onaddstream = function (evt) {
    console.log("going to add their stream...");
    mainVideoArea.srcObject = evt.stream;
  };

  navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
      getUserMedia: function(c) {
          return new Promise(function(y, n) {
              (navigator.mozGetUserMedia ||
              navigator.webkitGetUserMedia).call(navigator, c, y, n);
          });
      }
  } : null);

  if (!navigator.mediaDevices) {
      console.log("getUserMedia() not supported.");
  }

  navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  .then(function(stream) {
    smallVideoArea.srcObject = stream;
    pc.addStream(stream);
  })
  .catch((err) => logError(err));
}

function sendLocalDesc(desc) {
  pc.setLocalDescription(desc, function () {
    console.log("sending local description");
    socket.emit(
      'signal',
      {
        user_type: "signaling",
        command: "SDP",
        user_data: JSON.stringify({ 'sdp': pc.localDescription })
      }
    );
  }, logError);
}

function logError(error) {
}

const muteMyself = document.querySelector("#muteMyself");
const pauseMyVideo = document.querySelector("#pauseMyVideo");

muteMyself.addEventListener('click', function(ev){
	console.log("muting/unmuting myself");
	const streams = pc.getLocalStreams();
	for (const stream of streams) {
		for (const audioTrack of stream.getAudioTracks()) {
			if (audioTrack.enabled) { muteMyself.innerHTML = "Unmute" }
			else { muteMyself.innerHTML = "Mute Myself" }
			audioTrack.enabled = !audioTrack.enabled;
		}
		console.log("Local stream: " + stream.id);
	}
	ev.preventDefault();
}, false);

pauseMyVideo.addEventListener('click', function(ev){
	console.log("pausing/unpausing my video");
	const streams = pc.getLocalStreams();
	for (const stream of streams) {
		for (const videoTrack of stream.getVideoTracks()) {
			if (videoTrack.enabled) { pauseMyVideo.innerHTML = "Start Video" }
			else { pauseMyVideo.innerHTML = "Pause Video" }
			videoTrack.enabled = !videoTrack.enabled;
		}
		console.log("Local stream: " + stream.id);
	}
	ev.preventDefault();
}, false);

var messageHolder = document.querySelector("#messageHolder");
var myMessage = document.querySelector("#myMessage");
var sendMessage = document.querySelector("#sendMessage");

function dataChannelStateChanged() {
  if (dataChannel.readyState === 'open') {
    console.log("Data Channel open");
    dataChannel.onmessage = receiveDataChannelMessage;
  }
}

function receiveDataChannel(event) {
  console.log("Receiving a data channel");
  dataChannel = event.channel;
  dataChannel.onmessage = receiveDataChannelMessage;
}

function receiveDataChannelMessage(event) {
  console.log("From DataChannel: " + event.data);
  appendChatMessage(event.data, 'message-out');
}

sendMessage.addEventListener('click', function(ev){
  dataChannel.send(myMessage.value);
  appendChatMessage(myMessage.value, 'message-in');
  myMessage.value = "";
  ev.preventDefault();
}, false);

function appendChatMessage(msg, className) {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = '<span>' + msg + '</span>';
  messageHolder.appendChild(div);
}