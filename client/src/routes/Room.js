import React, { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

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
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return <StyledVideo playsInline autoPlay ref={ref} />;
};

// const stop = () => {
//   SpeechRecognition.stopListening();
// };

// const start = () => {
//   SpeechRecognition.startListening({ language: "zh-HK", continuous: true });
// };

const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2,
};

const Room = (props) => {
  //   const { transcript, resetTranscript } = useSpeechRecognition();

  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    socketRef.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: videoConstraints, audio: true })
      .then((stream) => {
        userVideo.current.srcObject = stream;
        socketRef.current.emit("join room", roomID);
        socketRef.current.on("all users", (users) => {
          const peers = [];
          users.forEach((userID) => {
            const peer = createPeer(userID, socketRef.current.id, stream);
            peersRef.current.push({
              peerID: userID,
              peer,
            });
            peers.push(peer);
          });
          setPeers(peers);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          });

          setPeers((users) => [...users, peer]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });
      });
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  const [message, setMessage] = useState("");
  const [food, setFood] = useState("");
  const commands = [
    // {
    //   command: "I would like to order *",
    //   callback: (food) => setMessage(`Your order is for: ${food}`),
    // },
    // {
    //   command: "*Hello*",
    //   callback: () => setMessage(`Hi there`),
    //   matchInterim: true,
    // },
    {
      command: "*PHP*",
      callback: () => {
        let msg = message;
        if (!msg.includes("php")) {
          msg = message + "php ";
          setMessage(msg);
        }
      },
      matchInterim: true,
    },
    {
      command: "*JAVA*",
      callback: () => {
        let msg = message;
        if (!msg.includes("java")) {
          msg = message + "java ";
          setMessage(msg);
        }
      },
      matchInterim: true,
    },
    {
      command: "*hot dog*",
      callback: () => {
        if (!food.includes("hot dog")) {
          setFood(food + " hot dog");
        }
      },
      matchInterim: true,
    },
    {
      command: "*burger*",
      callback: () => {
        if (!food.includes("burger")) {
          setFood(food + " burger");
        }
      },
      matchInterim: true,
    },
  ];

  const { transcript, resetTranscript } = useSpeechRecognition({ commands });

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return null;
  }

  const start = () => {
    SpeechRecognition.startListening({ continuous: true, language: "zh-HK" });
  };

  const stop = () => {
    SpeechRecognition.stopListening();
  };

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <button onClick={resetTranscript}>Reset</button>
      <p>{message}</p>
      <br />
      <p>{food}</p>
      <p>{transcript}</p>
      <Container>
        <StyledVideo muted ref={userVideo} autoPlay playsInline />

        {peers.map((peer, index) => {
          return <Video key={index} peer={peer} />;
        })}
      </Container>
    </div>
  );
};

export default Room;
