// index.js (Nâng cao)
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

// XÁC THỰC WEBHOOK (Giữ nguyên, không thay đổi)
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

// NHẬN TIN NHẮN TỪ NGƯỜỜI DÙNG (Giữ nguyên, không thay đổi)
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            // Kiểm tra xem sự kiện là tin nhắn văn bản hay "postback" (khi bấm nút)
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                // (Chúng ta sẽ xử lý postback ở phiên bản sau)
                // handlePostback(sender_psid, webhook_event.postback);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// -------------------------------------------------------------------
// PHẦN NÂNG CẤP BẮT ĐẦU TỪ ĐÂY
// -------------------------------------------------------------------

/**
 * 5. HÀM XỬ LÝ TIN NHẮN (NÂNG CẤP)
 * Quyết định xem bot trả lời gì dựa trên tin nhắn nhận được.
 */
function handleMessage(sender_psid, received_message) {
    let response; // Đây là tin nhắn bot sẽ gửi
    let text = received_message.text;

    // Chuyển tin nhắn về chữ thường để dễ so sánh
    let lowerCaseText = text ? text.toLowerCase() : '';

    // === XỬ LÝ LOGIC (KEYWORD MATCHING) ===

    if (lowerCaseText.includes('chào') || lowerCaseText.includes('hi') || lowerCaseText.includes('hello')) {
        // 1. Nếu người dùng chào
        response = {
            'text': `Chào bạn! Mình là bot. Bạn cần giúp gì?`,
            // Thêm các nút "Trả lời nhanh"
            'quick_replies': [
                {
                    'content_type': 'text',
                    'title': 'Bạn là ai?', // Tiêu đề nút
                    'payload': 'FAQ_WHO_ARE_YOU', // Dữ liệu gửi lại (giống ID)
                },
                {
                    'content_type': 'text',
                    'title': 'Cần hỗ trợ',
                    'payload': 'NEED_SUPPORT',
                }
            ]
        };
    } else if (received_message.quick_reply) {
        // 2. Nếu người dùng bấm vào một nút "Trả lời nhanh"
        let payload = received_message.quick_reply.payload;

        if (payload === 'FAQ_WHO_ARE_YOU') {
            response = { 'text': 'Mình là chatbot được lập trình bằng Node.js!' };
        } else if (payload === 'NEED_SUPPORT') {
            response = { 'text': 'Bạn vui lòng để lại tin nhắn, mình sẽ báo admin.' };
        } else {
            response = { 'text': 'Cảm ơn bạn đã chọn!' };
        }
    } else {
        // 3. Nếu không khớp từ khóa nào (mặc định)
        response = {
            'text': `Bạn đã gửi: "${text}". Hiện mình chưa hiểu lắm. Gõ "chào" để bắt đầu nhé.`
        };
    }

    // Gửi tin nhắn trả lời
    callSendAPI(sender_psid, response);
}


/**
 * 6. HÀM GỬI TIN NHẮN QUA GRAPH API (NÂNG CẤP)
 * Gửi tin nhắn trả lời (có thể là text hoặc quick replies)
 */
async function callSendAPI(sender_psid, response) {
    // Thông tin request
    let request_body = {
        'recipient': {
            'id': sender_psid
        },
        'message': response // Response bây giờ có thể chứa text, quick_replies, v.v.
    };

    // URL của Graph API
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    try {
        await axios.post(url, request_body);
        console.log('Tin nhắn trả lời đã được gửi!');
    } catch (error) {
        console.error('Không thể gửi tin nhắn:', error.response ? error.response.data : error.message);
    }
}