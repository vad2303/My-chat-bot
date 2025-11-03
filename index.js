// index.js
'use strict';

// 1. IMPORT CÁC THƯ VIỆN
const express = require('express');
const axios = require('axios');
const app = express(); // Khởi tạo app express

// 2. CẤU HÌNH CÁC BIẾN MÔI TRƯỜNG
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// 3. MIDDLEWARE
app.use(express.json());

// 4. KHỞI TẠO MÁY CHỦ
app.listen(PORT, () => console.log(`Chatbot đang lắng nghe tại cổng ${PORT}`));

// -------------------------------------------------------------------

// 5. XÁC THỰC WEBHOOK (Giữ nguyên, không thay đổi)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// 6. NHẬN TIN NHẮN TỪ NGƯỜI DÙNG (Giữ nguyên)
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            // Kiểm tra xem sự kiện là tin nhắn văn bản hay "postback"
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                // (Chưa xử lý)
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

function handleMessage(sender_psid, received_message) {
    let response;
    let text = received_message.text;
    let lowerCaseText = text ? text.toLowerCase() : '';

    // === XỬ LÝ LOGIC (KEYWORD MATCHING) ===

    if (lowerCaseText.includes('chào') || lowerCaseText.includes('hi') || lowerCaseText.includes('hello')) {

        response = {
 
            'text': `Chào bạn! Mình là bot của Vũ Anh Dũng. Bạn cần giúp gì?`,
            'quick_replies': [
                {
                    'content_type': 'text',
                    'title': 'Bạn là ai?', // Tiêu đề nút
                    'payload': 'FAQ_WHO_ARE_YOU', // ID của nút
                },
                {
                    'content_type': 'text',
                    'title': 'Cần hỗ trợ',
                    'payload': 'NEED_SUPPORT',
                }
            ]
        };
    } else if (received_message.quick_reply) {

        let payload = received_message.quick_reply.payload;

        if (payload === 'FAQ_WHO_ARE_YOU') {
            response = { 'text': 'Mình là chatbot của Vũ Anh Dũng, được lập trình bằng Node.js!' };
        } else if (payload === 'NEED_SUPPORT') {
            response = { 'text': 'Bạn vui lòng để lại tin nhắn, mình sẽ báo anh Dũng.' };
        } else {
            response = { 'text': 'Cảm ơn bạn đã chọn!' };
        }
    } else if (received_message.quick_reply) {
    } else if (lowerCaseText.includes('tạm biệt') || lowerCaseText.includes('bye')) {
        response = {
            'text': 'Tạm biệt! Hẹn gặp lại bạn sau. 👋'
        };
        
    } else if (lowerCaseText.includes('mã sinh viên') || lowerCaseText.includes('bao nhiêu tiền')) {
        // 4. Nếu người dùng hỏi giá
        response = {
            'text': 'Mã sinh viên của Dũng là 2121051487'
        };
        } else if (lowerCaseText.includes('trường') || lowerCaseText.includes('TỪ_KHÓA_2')) {
        // Câu trả lời cho từ khóa này
        response = {
            'text': 'Đại học Mỏ - Địa Chất'
        };
    } else {
        response = {
            'text': `Bạn đã gửi: "${text}". Hiện mình chưa hiểu lắm. Gõ "chào" để bắt đầu nhé.`
        };
    }

    // Gửi tin nhắn trả lời
    callSendAPI(sender_psid, response);
}

async function callSendAPI(sender_psid, response) {
    let request_body = {
        'recipient': {
            'id': sender_psid
        },
        'message': response
    };

    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    try {
        await axios.post(url, request_body);
        console.log('Tin nhắn trả lời đã được gửi!');
    } catch (error) {
        console.error('Không thể gửi tin nhắn:', error.response ? error.response.data : error.message);
    }
}