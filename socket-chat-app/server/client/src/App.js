import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');



function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat_message');
    };
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit('join_chat', username);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chat_message', {
        sender: username,
        message,
        time: new Date().toLocaleTimeString()
      });
      setMessage('');
    }
  };

  return (
    <div className="App">
      {!username ? (
        <div>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleJoin}>Join Chat</button>
        </div>
      ) : (
        <div>
          <h1>Welcome, {username}</h1>
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i}>
                <strong>{msg.sender}: </strong>
                {msg.message} <small>{msg.time}</small>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}

const [isTyping, setIsTyping] = useState(false);
const [typingUser, setTypingUser] = useState('');

useEffect(() => {
  // ... other socket listeners
  socket.on('typing', (username) => {
    setTypingUser(username);
    setIsTyping(true);
  });
  
  socket.on('stop_typing', () => {
    setIsTyping(false);
  });
}, []);

const handleTyping = (e) => {
  setMessage(e.target.value);
  if (!isTyping) {
    socket.emit('typing', username);
    setTimeout(() => {
      socket.emit('stop_typing');
    }, 2000);
  }
};

// Update input onChange to use handleTyping
<input
  type="text"
  value={message}
  onChange={handleTyping}
  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
/>

// Add typing indicator display
{isTyping && <p>{typingUser} is typing...</p>}

const [users, setUsers] = useState([]);
const [privateRecipient, setPrivateRecipient] = useState(null);

useEffect(() => {
  // ... other socket listeners
  socket.on('users_online', (users) => {
    setUsers(users.filter(user => user.id !== socket.id));
  });
  
  socket.on('private_message', (msg) => {
    setMessages(prev => [...prev, { ...msg, isPrivate: true }]);
  });
}, []);

const sendPrivateMessage = () => {
  if (message.trim() && privateRecipient) {
    socket.emit('private_message', {
      recipientId: privateRecipient,
      message,
      sender: username
    });
    setMessages(prev => [...prev, {
      sender: username,
      message: `(Private to ${users.find(u => u.id === privateRecipient)?.username}): ${message}`,
      time: new Date().toLocaleTimeString(),
      isPrivate: true
    }]);
    setMessage('');
  }
};

// Add user list and private message button
<div className="users">
  <h3>Online Users</h3>
  <ul>
    {users.map(user => (
      <li key={user.id}>
        {user.username}
        <button onClick={() => setPrivateRecipient(user.id)}>PM</button>
      </li>
    ))}
  </ul>
</div>

// Update send message logic
const sendMessage = () => {
  if (privateRecipient) {
    sendPrivateMessage();
  } else {
    // ... existing send message logic
  }
};

const [currentRoom, setCurrentRoom] = useState('general');
const [rooms, setRooms] = useState(['general', 'random', 'help']);

useEffect(() => {
  // ... other socket listeners
  socket.on('room_message', (msg) => {
    setMessages(prev => [...prev, { ...msg, room: currentRoom }]);
  });
}, [currentRoom]);

const joinRoom = (room) => {
  setCurrentRoom(room);
  setMessages([]);
  socket.emit('join_room', { username, room });
};

// Add room selection
<div className="rooms">
  <h3>Rooms</h3>
  <ul>
    {rooms.map(room => (
      <li key={room}>
        <button onClick={() => joinRoom(room)}>{room}</button>
      </li>
    ))}
  </ul>
</div>


const playNotificationSound = () => {
  const audio = new Audio('/notification.mp3');
  audio.play();
};

useEffect(() => {
  // ... other socket listeners
  socket.on('chat_message', (msg) => {
    if (msg.sender !== username) {
      playNotificationSound();
    }
    setMessages(prev => [...prev, msg]);
  });
  
  socket.on('private_message', (msg) => {
    playNotificationSound();
    setMessages(prev => [...prev, { ...msg, isPrivate: true }]);
  });
}, [username]);

const showNotification = (title, body) => {
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
};

useEffect(() => {
  // ... other socket listeners
  socket.on('private_message', (msg) => {
    showNotification(`New message from ${msg.sender}`, msg.message);
    // ... rest of the logic
  });
}, []);

const [hasMoreMessages, setHasMoreMessages] = useState(true);

useEffect(() => {
  // ... other socket listeners
  socket.on('message_history', (history) => {
    setMessages(history);
  });
}, []);

const loadMoreMessages = () => {
  // Implement logic to load older messages
};

useEffect(() => {
  const onConnect = () => {
    setIsConnected(true);
    if (username) {
      socket.emit('join_chat', username);
      if (currentRoom) {
        socket.emit('join_room', { username, room: currentRoom });
      }
    }
  };

  socket.on('connect', onConnect);
  
  socket.io.on('reconnect_attempt', () => {
    console.log('Attempting to reconnect...');
  });
  
  socket.io.on('reconnect', () => {
    console.log('Reconnected!');
  });
  
  return () => {
    socket.off('connect', onConnect);
  };
}, [username, currentRoom]);

export default App;
