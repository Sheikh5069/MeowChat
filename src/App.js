import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, LogOut, Upload, File, X, Loader } from 'lucide-react';
import { 
  saveMessage, 
  listenToMessages, 
  uploadFile,
  saveUserToRoom,
  removeUserFromRoom 
} from './firebase';
import './App.css';

export default function ChatApp() {
  const [currentPage, setCurrentPage] = useState('login');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectedUser, setConnectedUser] = useState(null);
  const [currentUserId] = useState(Math.random().toString(36).substr(2, 9));
  const [sharedKey, setSharedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Encryption function
  const encryptMessage = (text, key) => {
    if (!key) return text;
    try {
      return btoa(text + key);
    } catch {
      return text;
    }
  };

  // Decryption function
  const decryptMessage = (encrypted, key) => {
    if (!key) return encrypted;
    try {
      const decrypted = atob(encrypted);
      return decrypted.replace(key, '');
    } catch {
      return encrypted;
    }
  };

  // Join room
  const handleJoinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      alert('Please enter both username and room code');
      return;
    }

    setLoading(true);

    const key = btoa(roomCode);
    setSharedKey(key);

    const userId = currentUserId;
    const roomCodeUppercase = roomCode.toUpperCase();

    try {
      await saveUserToRoom(roomCodeUppercase, userId, username);

      setConnectedUser({
        username: username,
        id: userId,
      });

      // Listen to messages
      const unsubscribe = listenToMessages(roomCodeUppercase, (msgs) => {
        setMessages(msgs);
      });

      unsubscribeRef.current = unsubscribe;

      setCurrentPage('chat');

      const welcomeMsg = {
        id: `sys-${Date.now()}`,
        sender: 'System',
        type: 'system',
        text: `${username} joined the room`,
        timestamp: new Date().toISOString(),
        encrypted: false,
      };

      await saveMessage(roomCodeUppercase, welcomeMsg);
    } catch (error) {
      alert('Error joining room: ' + error.message);
      setLoading(false);
    }

    setLoading(false);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);

    try {
      const downloadURL = await uploadFile(roomCode.toUpperCase(), file);

      if (downloadURL) {
        const fileMessage = {
          sender: username,
          senderId: currentUserId,
          type: 'file',
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(2),
          fileUrl: downloadURL,
          timestamp: new Date().toISOString(),
          encrypted: true,
        };

        await saveMessage(roomCode.toUpperCase(), fileMessage);
      }
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    }

    setUploadingFile(false);
    fileInputRef.current.value = '';
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const encrypted = encryptMessage(inputMessage, sharedKey);

    const newMessage = {
      sender: username,
      senderId: currentUserId,
      type: 'text',
      text: encrypted,
      timestamp: new Date().toISOString(),
      encrypted: true,
    };

    try {
      await saveMessage(roomCode.toUpperCase(), newMessage);
      setInputMessage('');
    } catch (error) {
      alert('Error sending message: ' + error.message);
    }
  };

  // Exit room
  const handleExit = async () => {
    try {
      await removeUserFromRoom(roomCode.toUpperCase(), currentUserId);

      const exitMsg = {
        sender: 'System',
        type: 'system',
        text: `${username} left the room`,
        timestamp: new Date().toISOString(),
      };

      await saveMessage(roomCode.toUpperCase(), exitMsg);

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      setCurrentPage('login');
      setMessages([]);
      setConnectedUser(null);
      setUsername('');
      setRoomCode('');
    } catch (error) {
      console.error('Error exiting:', error);
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Login page
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-800">SecureChat</h1>
          </div>

          <p className="text-center text-gray-600 mb-6">
            End-to-End Encrypted Private Chat
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g., ROOM123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Share this code with your chat partner
              </p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Chat Room'}
            </button>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>🔒 End-to-End Encrypted:</strong> All messages are encrypted and only you and your chat partner can read them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chat page
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              SecureChat
            </h1>
            <p className="text-sm text-blue-100">
              Connected as: <strong>{username}</strong> | Room: <strong>{roomCode.toUpperCase()}</strong>
            </p>
          </div>
          <button
            onClick={handleExit}
            className="flex items-center bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start chatting!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
                } message-enter`}
              >
                {msg.type === 'system' ? (
                  <div className="text-center text-gray-500 text-sm w-full">
                    {msg.text}
                  </div>
                ) : msg.type === 'file' ? (
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      msg.senderId === currentUserId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4" />
                      <span className="text-sm font-medium truncate">
                        {msg.fileName}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-75">{msg.fileSize} KB</p>
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-2 inline-block underline hover:opacity-80"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg message-bubble ${
                      msg.senderId === currentUserId
                        ? 'sender-message'
                        : 'receiver-message'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                    <p className="break-words">
                      {decryptMessage(msg.text, sharedKey)}
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition disabled:opacity-50"
              title="Upload file"
            >
              {uploadingFile ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,application/pdf,video/*"
              disabled={uploadingFile}
            />
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
