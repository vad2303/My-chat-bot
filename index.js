// index.js (Tích hợp Gemini)
'use strict';

// 1. IMPORT CÁC THƯ VIỆN
const express = require('express');
const axios = require('axios');
const app = express();

// --- IMPORT THƯ VIỆN MỚI CỦA GEMINI ---
const { GoogleGenerativeAI } = require('@google/generative-ai');
// -------------------------------------

// 2. CẤU HÌNH CÁC BIẾN MÔI TRƯỜNG
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// --- BIẾN MÔI TRƯỜNG MỚI CỦA GEMINI ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// ------------------------------------

// 3. KHỞI TẠO CÁC CLIENT
app.use(express.json());

// --- KHỞI TẠO GEMINI ---
let genAI;
let model;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-latest"});
    console.log("Đã khởi tạo Gemini thành công.");
} else {
    console.error("Chưa cung cấp GEMINI_API_KEY. Bot sẽ không hoạt động với AI.");
}
// -----------------------

// 4. KHỞI TẠO MÁY CHỦ;
app.listen(PORT, () => console.log(`Chatbot đang lắng nghe tại cổng ${PORT}`));

// 5. XÁC THỰC WEBHOOK (Giữ nguyên)
app.get('/webhook', (req, res) => {
    // ... (Toàn bộ code xác thực webhook giữ nguyên như cũ) ...
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

            if (webhook_event.message && webhook_event.message.text) {
                // Chỉ xử lý tin nhắn văn bản
                handleMessage(sender_psid, webhook_event.message);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// -------------------------------------------------------------------
// PHẦN NÂNG CẤP GEMINI
// -------------------------------------------------------------------

/**
 * 7. HÀM XỬ LÝ TIN NHẮN (VIẾT LẠI VỚI GEMINI)
 * Hàm này giờ sẽ là "async" để chờ Gemini trả lời
 */
async function handleMessage(sender_psid, received_message) {
    let response;
    let user_message = received_message.text;

    // Nếu chưa cấu hình API Key, trả lời mặc định
    if (!model) {
        response = { 'text': 'Xin lỗi, bộ não AI của tôi chưa được kết nối.' };
        callSendAPI(sender_psid, response);
        return;
    }

    try {
        // --- BẮT ĐẦU GỌI GEMINI ---
        console.log(`Đang gửi tới Gemini: "${user_message}"`);
        
        // (Nâng cao: Thêm "bối cảnh" cho Gemini)
        const prompt = `Bạn là một chatbot trợ lý thân thiện tên là "Bot". 
                       Người dùng nói: "${user_message}"
                       Hãy trả lời người dùng:`;

        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        const gemini_text = geminiResponse.text();

        console.log(`Gemini trả lời: "${gemini_text}"`);
        // --- KẾT THÚC GỌI GEMINI ---

        // Gói câu trả lời của Gemini để gửi cho người dùng
        response = { 'text': gemini_text };

    } catch (error) {
        console.error('LỖI KHI GỌI GEMINI:', error);
        response = { 'text': 'Xin lỗi, tôi đang gặp chút lỗi khi suy nghĩ. Bạn thử lại sau nhé.' };
    }

    // Gửi tin nhắn trả lời
    callSendAPI(sender_psid, response);
}


/**
 * 8. HÀM GỬI TIN NHẮN QUA GRAPH API (Giữ nguyên)
 */
async function callSendAPI(sender_psid, response) {
    let request_body = {
        'recipient': { 'id': sender_psid },
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