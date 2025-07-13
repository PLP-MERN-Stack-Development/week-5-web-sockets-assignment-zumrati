import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

let users = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_chat', (username) => {
    users.push({ id: socket.id, username });
    io.emit('users_online', users);
    io.emit('chat_message', {
      sender: 'System',
      message: `${username} has joined the chat`,
      time: new Date().toLocaleTimeString()
    });
  });

  // ... rest of the code
});

socket.on('typing', (username) => {
  socket.broadcast.emit('typing', username);
});

socket.on('stop_typing', () => {
  socket.broadcast.emit('stop_typing');
});

socket.on('private_message', ({ recipientId, message, sender }) => {
  io.to(recipientId).emit('private_message', {
    sender,
    message,
    time: new Date().toLocaleTimeString()
  });
});

socket.on('join_room', ({ username, room }) => {
  socket.join(room);
  socket.emit('room_message', {
    sender: 'System',
    message: `Welcome to room ${room}`,
    time: new Date().toLocaleTimeString()
  });
  
  socket.broadcast.to(room).emit('room_message', {
    sender: 'System',
    message: `${username} has joined the room`,
    time: new Date().toLocaleTimeString()
  });
});

socket.on('room_message', ({ room, message, sender }) => {
  io.to(room).emit('room_message', {
    sender,
    message,
    time: new Date().toLocaleTimeString()
  });
});

const messageHistory = {};

socket.on('join_room', ({ room }) => {
  if (!messageHistory[room]) {
    messageHistory[room] = [];
  }
  socket.emit('message_history', messageHistory[room].slice(-50));
});

socket.on('room_message', ({ room, message, sender }) => {
  const msg = {
    sender,
    message,
    time: new Date().toLocaleTimeString()
  };
  
  if (!messageHistory[room]) {
    messageHistory[room] = [];
  }
  
  messageHistory[room].push(msg);
  if (messageHistory[room].length > 100) {
    messageHistory[room].shift();
  }
  
  io.to(room).emit('room_message', msg);
});
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
