const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const mongoURI = 'mongodb+srv://mome:mome@cluster0.vy64m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Visitor schema and model
const visitorSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    company_name: String,
    designation: String,
    date_of_visiting: Date
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'manohar@symfor.com',
        pass: 'ythe grkf fyxz vvna' // Use an app-specific password
    }
});

// Send confirmation email function
const sendConfirmationEmail = (visitor) => {
    const mailOptions = {
        from: 'manohar@symfor.com',
        to: visitor.email,
        subject: 'Visitor Registration Confirmation',
        text: `Dear ${visitor.name},\n\nThank you for registering!\n\nWe look forward to seeing you on ${new Date(visitor.date_of_visiting).toLocaleDateString()}.\n\nBest regards,\nMoME`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

// Initialize WhatsApp Client
const client = new Client();

client.on('qr', (qr) => {
    // Log QR code in the terminal
    qrcode.generate(qr, { small: true });
    console.log('QR Code received, scan it to log in.');
});

// When the client is ready
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Start WhatsApp client
client.initialize();

// Send WhatsApp message function
const sendWhatsAppMessage = (number, message) => {
    // Remove any non-digit characters from the phone number
    const chatId = number+ "@c.us";
    client.sendMessage(chatId,message)
            .then(response => {
                console.log('WhatsApp message sent successfully:', response);
            })
            .catch(err => {
                console.error('Error sending WhatsApp message:', err);
            });
  
};

// Routes

// Add a new visitor
app.post('/api/visitors', async (req, res) => {
    const { name, email, phone, company_name, designation, date_of_visiting } = req.body;

    // Validate incoming data
    if (!name || !email || !phone || !company_name || !designation || !date_of_visiting) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newVisitor = new Visitor({
        name,
        email,
        phone,
        company_name,
        designation,
        date_of_visiting
    });

    try {
        const savedVisitor = await newVisitor.save();
        
        // Send confirmation email
        sendConfirmationEmail(savedVisitor);
        
        // Send WhatsApp message
        const whatsappMessage = `Dear ${savedVisitor.name},\n\nThank you for registering!\n\nWe look forward to seeing you on ${new Date(savedVisitor.date_of_visiting).toLocaleDateString()}.\n\nBest regards,\nMoME`;
        sendWhatsAppMessage(savedVisitor.phone, whatsappMessage);
        
        res.status(201).json({ message: 'Visitor added successfully', visitor_id: savedVisitor._id });
    } catch (err) {
        console.error('Error saving visitor:', err);
        res.status(500).json({ message: 'Failed to add visitor: ' + err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
