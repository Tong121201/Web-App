// notification-server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin with your credentials
admin.initializeApp({
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": "myproject-9638b",
    "private_key_id": "8366a866e0d6cbe730e72d00532e92467366ccc7",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2lrpwYKjevV7U\nrO5Wv3kT6FaxB0dqrncrb1jxyWFw+TU/cmPtI7g9G0OQ3KpfpSz+ei0kfrFBwKd6\n39vwNmo15wg//rkyl7m9LsK2UYYrt6dtCHu5FTaFlabnBkwyesvKCEwwvLNqfwkL\nBc6aJwJCygmYB4mN0VOpmV0/bgnAh85RPHO4fHJGCazpHcg+JrZzh/xbG4eHQzV+\nBjhbOzhWBo4p89GyUXK7obCiz3PZEse2fCTQ0vHwvHeqaMxPNhLdWf9iAO/+dCjO\nLjYw/bUhvaI74Y8qGUJvQRH+bloni5npXbeV7iGO6zYnCFW07RwvThVwCPdzlPr3\nYB6SbCSHAgMBAAECggEAJcIAtvl+ImWVxTQnq1+4GZJLzxr6vUhr01sY0RM8Z8DZ\nLpAosuLWmChZrgy73MCLD+rTB/99B2RgHexKDqAqEZB/p8A0qw4uNj2DvXEZZlP5\ntvXwo+MLnc9HLvIh8rRrDRHvM4rqLUUs6Q8f3MfhU091cW9plh6qBuH0owfN03bH\n01Gj+YlkSZDf634NRv2Q5k18EmDRGevCComjoTpyv1oox38r/dejKvRnOSc3IuLT\nWyhKNsbVmX/dKFI6tQAqTLrz9MGerT37hLaRxX7i7W9X9fkgRr/F5LY0Peuop0yw\nH+XOZCQaWnbdv+X8vySFxdpYtaP9tzhHMHDfM+9B9QKBgQC9aHahz4+YW8XHMQa3\nMXdMZe/uBT+OGPu1OUg45tPgfAp+9xkAVjYjB3eMTY4GqIu49zYkPMX1fMbfoVyx\ng6fRbKKeoZJgEZbOmGsgyi2X0ymJraTnprQMNCz2DvVHLxGLHT9SqG/IfSu1lAm2\ndlYEtlG+L2zL6XdDNK+34uY/2wKBgQD2yIArN1G0ozC+X/FZPpNKNTeGCASKOUmW\nzFF0o2PNRb3VuXGCUP9J3+bkVZZZJ8N4mrDwK+l3fi3kHmds6bSr0/T98jkib1Jv\nHfM+IEuiZ+A4+5/ZDaf5XnwuhTZARyK7qbtQN2OvfM9C8TOYTNZV2Ry08c8F+Ufr\nLtvQ4GtTxQKBgQCKgH/3VOLpA3q9bME/ZmGZMRVglN/jlatB2rBQQ6J9jdbS/vd+\nQox10vj9VJzdi5QYXlVt7C7Jk0ONtd4lRGOMBYdovjdeHp6LVfNIV+89DUFblul2\nJ3WTUvfpughr1CRc+LccR2TuU3GJ5sWvchr2eSePDfjdp0v5jeZMbhP2bwKBgHdk\n+7Vs1yfYyC1ix6aQwrvlUU6UNHYXT0YY5dPTdOaMNlLfnE4bF9fK7q9LxSivNz/z\nP2WDKTn5nwQ9vXYQ/6seKeputTu2tiAyUkudXlpdfTq0alqd48We89+h7WRdxi0a\n6hfeJGlzrebKQVcO3ae9GcllL+7I8wWSryC4YtStAoGAfC8IrWURTF+Gw6hj6UfJ\nP3zmnGg430/sLaW+7gzW5ABuLY40rMTwwSLWEroyeGTmGfxzZza4waIlY485rQna\nS5dtpqtOOQ57sV850iag4e4sYVE8aWGW1tIQxyjqWKET3eyGUoPGoJ/pgaopPtm4\nNH15stGySQTyUgPERIM+u+Y=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-jbzpf@myproject-9638b.iam.gserviceaccount.com",
    "client_id": "101667158923658355383",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-jbzpf%40myproject-9638b.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  })
});

// Test endpoint to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Notification server is running!' });
});

// Endpoint to handle push notifications
app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    console.log('Received notification request:', { token, title, body, data });

    if (!token) {
      console.error('Missing device token');
      return res.status(400).json({ 
        success: false, 
        error: 'Device token is required' 
      });
    }

    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      token: token
    };

    console.log('Sending FCM message:', message);
    const response = await admin.messaging().send(message);
    console.log('FCM response:', response);
    
    res.status(200).json({ 
      success: true, 
      message: 'Notification sent successfully',
      messageId: response
    });
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Notification server is running on port ${PORT}`);
  console.log(`Test the server at http://localhost:${PORT}/test`);
});