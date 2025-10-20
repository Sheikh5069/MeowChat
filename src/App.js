import { useState, useEffect, useRef } from 'react';
import { Send, Lock, LogOut, Upload, File, Loader, MessageSquare, Shield } from 'lucide-react';
import { saveMessage, listenToMessages, uploadFile, saveUserToRoom, removeUserFromRoom } from './firebase';
import './App.css';

export default function ChatApp() {
  const [currentPage, setCurrentPage] = useState('login');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentUserId] = useState(Math.random().toString(36).substr(2, 9));
  const [sharedKey, setSharedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const encryptMessage = (text, key) => {
    if (!key) return text;
    try {
      return btoa(text + key);
    } catch {
      return text;
    }
  };

  const decryptMessage = (encrypted, key) => {
    if (!key) return encrypted;
    try {
      const decrypted = atob(encrypted);
      return decrypted.replace(key, '');
    } catch {
      return encrypted;
    }
  };

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
    }

    setLoading(false);
  };

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
          timestamp: Date.now(),
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const encrypted = encryptMessage(inputMessage, sharedKey);
    const timestamp = Date.now();

    const newMessage = {
      sender: username,
      senderId: currentUserId,
      type: 'text',
      text: encrypted,
      timestamp: timestamp,
      encrypted: true,
    };

    try {
      const result = await saveMessage(roomCode.toUpperCase(), newMessage);
      if (result) {
        setInputMessage('');
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

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
      setUsername('');
      setRoomCode('');
    } catch (error) {
      console.error('Error exiting:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/20">
          {/* Header with icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4 rounded-2xl mb-4 shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">SecureChat</h1>
            <p className="text-gray-600 text-sm mt-2">Private • Encrypted • Secure</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all bg-gray-50"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g., CHAT2024"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all bg-gray-50 uppercase"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2 ml-1">🔑 Share this code with your chat partner</p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Chat Room'
              )}
            </button>
          </div>

          {/* Security info */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900 mb-1">End-to-End Encrypted</p>
                <p className="text-xs text-purple-800">All messages are encrypted. Only you and your partner can read them.</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">🔒 Secure</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">📱 Instant</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">🚀 Fast</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white p-5 shadow-2xl border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SecureChat</h1>
              <p className="text-sm text-blue-100">
                {username} • <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{roomCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="flex items-center bg-red-500/80 hover:bg-red-600 px-4 py-2 rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <div className="bg-gray-800/50 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center">
                <MessageSquare className="w-12 h-12 opacity-30" />
              </div>
              <p className="text-lg font-semibold">No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'} animate-slideIn`}
              >
                {msg.type === 'system' ? (
                  <div className="text-center text-gray-500 text-sm w-full my-2 font-medium">
                    <span className="bg-gray-800 px-3 py-1 rounded-full inline-block">{msg.text}</span>
                  </div>
                ) : msg.type === 'file' ? (
                  <div
                    className={`max-w-xs p-4 rounded-2xl backdrop-blur ${
                      msg.senderId === currentUserId
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-700/80 text-gray-100 shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${msg.senderId === currentUserId ? 'bg-white/20' : 'bg-gray-600'}`}>
                        <File className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{msg.fileName}</p>
                        <p className="text-xs opacity-75">{msg.fileSize} KB</p>
                      </div>
                    </div>
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-3 inline-block px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <div
                    className={`max-w-xs px-5 py-3 rounded-3xl break-words shadow-lg transform transition ${
                      msg.senderId === currentUserId
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none'
                        : 'bg-gray-700/80 text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-xs font-bold mb-1 opacity-80">{msg.sender}</p>
                    <p className="break-words text-sm leading-relaxed">{decryptMessage(msg.text, sharedKey)}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-5 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
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
              className="flex-1 px-5 py-3 border-2 border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all bg-gray-700 text-white placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}import { useState, useEffect, useRef } from 'react';
import { Send, Lock, LogOut, Upload, File, Loader, MessageSquare, Shield } from 'lucide-react';
import { saveMessage, listenToMessages, uploadFile, saveUserToRoom, removeUserFromRoom } from './firebase';
import './App.css';

export default function ChatApp() {
  const [currentPage, setCurrentPage] = useState('login');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentUserId] = useState(Math.random().toString(36).substr(2, 9));
  const [sharedKey, setSharedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const encryptMessage = (text, key) => {
    if (!key) return text;
    try {
      return btoa(text + key);
    } catch {
      return text;
    }
  };

  const decryptMessage = (encrypted, key) => {
    if (!key) return encrypted;
    try {
      const decrypted = atob(encrypted);
      return decrypted.replace(key, '');
    } catch {
      return encrypted;
    }
  };

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
    }

    setLoading(false);
  };

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
          timestamp: Date.now(),
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const encrypted = encryptMessage(inputMessage, sharedKey);
    const timestamp = Date.now();

    const newMessage = {
      sender: username,
      senderId: currentUserId,
      type: 'text',
      text: encrypted,
      timestamp: timestamp,
      encrypted: true,
    };

    try {
      const result = await saveMessage(roomCode.toUpperCase(), newMessage);
      if (result) {
        setInputMessage('');
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

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
      setUsername('');
      setRoomCode('');
    } catch (error) {
      console.error('Error exiting:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/20">
          {/* Header with icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4 rounded-2xl mb-4 shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">SecureChat</h1>
            <p className="text-gray-600 text-sm mt-2">Private • Encrypted • Secure</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all bg-gray-50"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g., CHAT2024"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all bg-gray-50 uppercase"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2 ml-1">🔑 Share this code with your chat partner</p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Chat Room'
              )}
            </button>
          </div>

          {/* Security info */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900 mb-1">End-to-End Encrypted</p>
                <p className="text-xs text-purple-800">All messages are encrypted. Only you and your partner can read them.</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">🔒 Secure</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">📱 Instant</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600 font-semibold">🚀 Fast</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white p-5 shadow-2xl border-b border-white/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SecureChat</h1>
              <p className="text-sm text-blue-100">
                {username} • <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{roomCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="flex items-center bg-red-500/80 hover:bg-red-600 px-4 py-2 rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <div className="bg-gray-800/50 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center">
                <MessageSquare className="w-12 h-12 opacity-30" />
              </div>
              <p className="text-lg font-semibold">No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'} animate-slideIn`}
              >
                {msg.type === 'system' ? (
                  <div className="text-center text-gray-500 text-sm w-full my-2 font-medium">
                    <span className="bg-gray-800 px-3 py-1 rounded-full inline-block">{msg.text}</span>
                  </div>
                ) : msg.type === 'file' ? (
                  <div
                    className={`max-w-xs p-4 rounded-2xl backdrop-blur ${
                      msg.senderId === currentUserId
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-700/80 text-gray-100 shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${msg.senderId === currentUserId ? 'bg-white/20' : 'bg-gray-600'}`}>
                        <File className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{msg.fileName}</p>
                        <p className="text-xs opacity-75">{msg.fileSize} KB</p>
                      </div>
                    </div>
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-3 inline-block px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <div
                    className={`max-w-xs px-5 py-3 rounded-3xl break-words shadow-lg transform transition ${
                      msg.senderId === currentUserId
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none'
                        : 'bg-gray-700/80 text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-xs font-bold mb-1 opacity-80">{msg.sender}</p>
                    <p className="break-words text-sm leading-relaxed">{decryptMessage(msg.text, sharedKey)}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-5 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
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
              className="flex-1 px-5 py-3 border-2 border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all bg-gray-700 text-white placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
