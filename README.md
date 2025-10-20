# SecureChat - End-to-End Encrypted Chat Application

A secure, real-time chat application with end-to-end encryption, file sharing, and Firebase integration.

## Features

✅ End-to-End Encryption
✅ Real-time Messaging
✅ File Sharing (Images, PDFs, Videos)
✅ Link Sharing
✅ Anonymous Authentication
✅ Room-based Connections
✅ User-friendly Interface

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase Account
- GitHub Account (for deployment)

## Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/securechat.git
cd securechat
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file with Firebase credentials
```bash
cp .env.example .env
```

4. Add your Firebase credentials to `.env`

5. Start the development server
```bash
npm start
```

## Usage

1. Open http://localhost:3000
2. Enter your username
3. Enter a unique room code
4. Share the room code with your chat partner
5. Start chatting securely!

## Deployment on Netlify

1. Push code to GitHub
2. Go to netlify.com
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Add environment variables
6. Deploy!

## Security Notes

- All messages are encrypted before sending
- Never share your `.env` file publicly
- Use strong room codes
- For production, implement stronger encryption using TweetNaCl.js

## Technologies Used

- React 18
- Firebase (Realtime Database, Storage, Authentication)
- Tailwind CSS
- Lucide React Icons
- CryptoJS

## License

MIT License

## Support

For issues or questions, please open a GitHub issue.
