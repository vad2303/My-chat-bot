// index.js
'use strict';

// 1. IMPORT CÁC THƯ VIỆN
const express = require('express');
const axios = require('axios');
const app = express(); // Khởi tạo app express

// 2. CẤU HÌNH CÁC BIẾN MÔI TRƯỜNG
// Bạn *PHẢI* lấy các giá trị này từ Ứng dụng Facebook của bạn
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'YOUR_VERIFY_TOKEN';
const PORT = process.env.PORT || 3000;

// 3. MIDDLEWARE
// Cần thiết để xử lý dữ liệu JSON Facebook gửi đến
app.use(express.json());

// 4. KHỞI TẠO MÁY CHỦ
app.listen(PORT, () => console.log(`Chatbot đang lắng nghe tại cổng ${PORT}`));

// -------------------------------------------------------------------

/**
 * BƯỚC A: XÁC THỰC WEBHOOK
 * Facebook sẽ gửi một request GET đến URL này để xác thực webhook của bạn.
 */
app.get('/webhook', (req, res) => {
    console.log('GET /webhook: Đã nhận request xác thực');
    
    // Lấy các tham số từ query string
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Kiểm tra xem 'hub.mode' và 'hub.verify_token' có đúng không
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Xác thực thành công
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Xác thực thất bại
            console.log('WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403); // Forbidden
        }
    } else {
        res.sendStatus(400); // Bad Request
    }
});

/**
 * BƯỚC B: NHẬN TIN NHẮN TỪ NGƯỜI DÙNG
 * Facebook sẽ gửi một request POST đến URL này mỗi khi có tin nhắn mới.
 */
app.post('/webhook', (req, res) => {
    let body = req.body;
    console.log('POST /webhook: Đã nhận dữ liệu');

    // Kiểm tra xem đây có phải là sự kiện từ một trang không
    if (body.object === 'page') {
        
        // Lặp qua từng entry (có thể có nhiều nếu xử lý gộp)
        body.entry.forEach(function(entry) {
            // Lấy sự kiện messaging
            let webhook_event = entry.messaging[0];
            console.log('Sự kiện Webhook:', webhook_event);

            // Lấy ID người gửi (PSID)
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Kiểm tra xem sự kiện có phải là tin nhắn văn bản không
            if (webhook_event.message && webhook_event.message.text) {
                // Lấy nội dung tin nhắn
                let received_message = webhook_event.message.text;
                
                // Tạo tin nhắn phản hồi (echo)
                let response = {
                    'text': `Bạn đã gửi: "${received_message}"`
                };

                // Gửi tin nhắn trả lời
                callSendAPI(sender_psid, response);
            }
        });

        // Phản hồi lại Facebook rằng đã nhận (HTTP 200 OK)
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Trả về 404 Not Found nếu sự kiện không phải từ một trang
        res.sendStatus(404);
    }
});

/**
 * BƯỚC C: GỬI TIN NHẮN TRẢ LỜI (SỬ DỤNG GRAPH API)
 * Hàm này gọi đến Facebook Graph API để gửi tin nhắn.
 */
async function callSendAPI(sender_psid, response) {
    // Thông tin request
    let request_body = {
        'recipient': {
            'id': sender_psid
        },
        'message': response
    };

    // URL của Graph API
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    try {
        // Gửi request POST bằng axios
        await axios.post(url, request_body);
        console.log('Tin nhắn trả lời đã được gửi!');
    } catch (error) {
        console.error('Không thể gửi tin nhắn:', error.response ? error.response.data : error.message);
    }
}