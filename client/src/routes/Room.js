import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const  iceServers = [{
   urls: [ "stun:sp-turn1.xirsys.com" ],
   iceTransportPolicy:"relay"
}, {
   username: "Djp82iI89nDEO3wi3yZtnbAYvr8yQwNQGQg00zCEIX2XnIHxK5roNG9me1h3YYsyAAAAAGLgN0xzZXlhZGVvZGlu",
   credential: "b99aff74-0d13-11ed-b464-0242ac120004",
   urls: [
       "turn:sp-turn1.xirsys.com:80?transport=udp",
       "turn:sp-turn1.xirsys.com:3478?transport=udp",
       "turn:sp-turn1.xirsys.com:80?transport=tcp",
       "turn:sp-turn1.xirsys.com:3478?transport=tcp",
       "turns:sp-turn1.xirsys.com:443?transport=tcp",
       "turns:sp-turn1.xirsys.com:5349?transport=tcp"
   ]
   
}]


const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", stream => {
      ref.current.srcObject = stream;
      console.log(ref.current.srcObject)
    })
  }, []);

  return (
    <StyledVideo playsInline autoPlay ref={ref} />
  );
}


const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2
};

const Room = (props) => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    socketRef.current = io.connect("/");
    navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
      userVideo.current.srcObject = stream;
      socketRef.current.emit("join room", roomID);
      socketRef.current.on("all users", users => {
        const peers = [];
        users.forEach(userID => {
          const peer = createPeer(userID, socketRef.current.id, stream);
          peersRef.current.push({
            peerID: userID,
            peer,
          })
          peers.push(peer);
        })
        setPeers(peers);
      })

      socketRef.current.on("user joined", payload => {
        const peer = addPeer(payload.signal, payload.callerID, stream);
        peersRef.current.push({
          peerID: payload.callerID,
          peer,
        })
        console.log(peersRef.current)

        setPeers(users => [...users, peer]);
      })
    
      socketRef.current.on("receiving returned signal", payload => {
        const item = peersRef.current.find(p => p.peerID === payload.id);
        item.peer.signal(payload.signal);
      })

      socketRef.current.on("user disconnected", payload => {
        console.log(payload);
        const newPeers  = peersRef.current.filter(item => item.peerID !== payload.id)
        peersRef.current = newPeers;

        setPeers(newPeers)
      })
    })

  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: { iceServers }
    });

    peer.on("signal", signal => {
      socketRef.current.emit("sending signal", {userToSignal, callerID, signal})
    })

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: iceServers,
    })

    peer.on("signal", signal => {
      socketRef.current.emit("returning signal", {signal, callerID});
    })

    peer.signal(incomingSignal);

    return peer;
  }

  function handleDisconnect() {
    console.log('handleDisconnect')
    socketRef.current.emit("disconnect")
  }

  return (
    <>
    <Container>
      <StyledVideo muted ref={userVideo} autoPlay playsInline />
      {peers.map((peer, index) => {
        return (
          <Video key={index} peer={peer} />
        );
      })}
    </Container>
      <button onClick={handleDisconnect}>Desconectar</button>
    </>
  );
};

export default Room;
