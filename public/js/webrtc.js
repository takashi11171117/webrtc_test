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