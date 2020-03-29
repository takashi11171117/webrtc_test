const master = {
  signalingClient: null,
  peerConnectionByClientId: {},
  dataChannelByClientId: {},
  localStream: null,
  remoteStreams: [],
  peerConnectionStatsInterval: null,
};

function _logStream(msg, stream) {
  if (! stream) {
    console.warn(msg + ': stream is NULL');
    return;
  }
  console.log(msg + ': id=' + stream.id);
  let videoTracks = stream.getVideoTracks();
  if (videoTracks) {
    console.log('videoTracks.length=' + videoTracks.length);
    videoTracks.forEach(function(track) {
      console.log(' track.id=' + track.id);
    });
  }
  
  let audioTracks = stream.getAudioTracks();
  if (audioTracks) {
    console.log('audioTracks.length=' + audioTracks.length);
    audioTracks.forEach(function(track) {
      console.log(' track.id=' + track.id);
    });
  }
}

async function startMaster(localView) {
  master.localView = localView;

  // Create KVS client
  const kinesisVideoClient = new AWS.KinesisVideo({
      region: awsConfig.region,
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
  });

  // Get signaling channel ARN
  const describeSignalingChannelResponse = await kinesisVideoClient
      .describeSignalingChannel({
          ChannelName: awsConfig.ChannelName,
      })
      .promise();
  const channelARN = describeSignalingChannelResponse.ChannelInfo.ChannelARN;
  console.log('[MASTER] Channel ARN: ', channelARN);

  // Get signaling channel endpoints
  const getSignalingChannelEndpointResponse = await kinesisVideoClient
      .getSignalingChannelEndpoint({
          ChannelARN: channelARN,
          SingleMasterChannelEndpointConfiguration: {
              Protocols: ['WSS', 'HTTPS'],
              Role: KVSWebRTC.Role.MASTER,
          },
      })
      .promise();
  const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce((endpoints, endpoint) => {
      endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
      return endpoints;
  }, {});
  console.log('[MASTER] Endpoints: ', endpointsByProtocol);

  // Create Signaling Client
  master.signalingClient = new window.KVSWebRTC.SignalingClient({
      channelARN,
      channelEndpoint: endpointsByProtocol.WSS,
      role: KVSWebRTC.Role.MASTER,
      region: awsConfig.region,
      credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
      },
  });

  // Get ICE server configuration
  const kinesisVideoSignalingChannelsClient = new AWS.KinesisVideoSignalingChannels({
      region: awsConfig.region,
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
      endpoint: endpointsByProtocol.HTTPS,
  });

  const iceServers = [];
  iceServers.push({ urls: `stun:stun.kinesisvideo.${awsConfig.region}.amazonaws.com:443` });
  console.log('[MASTER] ICE servers: ', iceServers);

  const configuration = {
      iceServers,
  };

  const resolution = { width: { ideal: 1280 }, height: { ideal: 720 } };
  const constraints = {
      video: resolution,
      audio: false,
  };

  // Get a stream from the webcam and display it in the local view
  try {
      master.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localView.srcObject = master.localStream;
      _logStream('local stream', master.localStream);
  } catch (e) {
      console.error('[MASTER] Could not find webcam');
  }

  master.signalingClient.on('open', async () => {
      console.log('[MASTER] Connected to signaling service');
  });

  master.signalingClient.on('sdpAnswer', async answer => {
      // Add the SDP answer to the peer connection
      console.log('[VIEWER] Received SDP answer');
      await viewer.peerConnection.setRemoteDescription(answer);
  });

  master.signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
      console.log('[MASTER] Received SDP offer from client: ' + remoteClientId);

      const peerConnection = new RTCPeerConnection(configuration);
      master.peerConnectionByClientId[remoteClientId] = peerConnection;

      peerConnection.addEventListener('icecandidate', ({ candidate }) => {
          if (candidate) {
              console.log('[MASTER] Generated ICE candidate for client: ' + remoteClientId);
          } else {
              console.log('[MASTER] All ICE candidates have been generated for client: ' + remoteClientId);
          }
      });

      console.log(master.localStream.getTracks());

      master.localStream.getTracks().forEach(
        track => {
          console.log('add track');
          peerConnection.addTrack(track, master.localStream);
        }
      );

      await peerConnection.setRemoteDescription(offer);

      // Create an SDP answer to send back to the client
      console.log('[MASTER] Creating SDP answer for client: ' + remoteClientId);
      await peerConnection.setLocalDescription(
          await peerConnection.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
          }),
      );
      console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
      master.signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);

      console.log('[MASTER] Generating ICE candidates for client: ' + remoteClientId);
  });

  master.signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
      console.log('[MASTER] Received ICE candidate from client: ' + remoteClientId);

      // Add the ICE candidate received from the client to the peer connection
      const peerConnection = master.peerConnectionByClientId[remoteClientId];
      peerConnection.addIceCandidate(candidate);
  });

  master.signalingClient.on('close', () => {
      console.log('[MASTER] Disconnected from signaling channel');
  });

  master.signalingClient.on('error', () => {
      console.error('[MASTER] Signaling client error');
  });

  console.log('[MASTER] Starting master connection');
  master.signalingClient.open();
}

$(window).on('load', () => {
  const localView = $('#master .local-view')[0];

  startMaster(localView);
});