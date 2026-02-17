const express = require('express');
const app = express();

app.use(express.json());

console.log('===========================================');
console.log('LINE ユーザーID/グループID 取得ツール');
console.log('===========================================\n');

app.post('/webhook', (req, res) => {
    console.log('📨 Webhookイベントを受信しました\n');
    console.log('受信データ:', JSON.stringify(req.body, null, 2));
    
    if (req.body.events && req.body.events.length > 0) {
        const event = req.body.events[0];
        
        console.log('\n==================== 重要情報 ====================');
        
        // ユーザーID
        if (event.source.userId) {
            console.log('✅ ユーザーID:');
            console.log('   ' + event.source.userId);
            console.log('\n   .envファイルに以下を設定してください:');
            console.log(`   LINE_USER_ID=${event.source.userId}`);
        }
        
        // グループID
        if (event.source.groupId) {
            console.log('✅ グループID:');
            console.log('   ' + event.source.groupId);
            console.log('\n   .envファイルに以下を設定してください:');
            console.log(`   LINE_USER_ID=${event.source.groupId}`);
        }
        
        // ルームID（複数人トーク）
        if (event.source.roomId) {
            console.log('✅ ルームID:');
            console.log('   ' + event.source.roomId);
            console.log('\n   .envファイルに以下を設定してください:');
            console.log(`   LINE_USER_ID=${event.source.roomId}`);
        }
        
        console.log('================================================\n');
    }
    
    res.status(200).send('OK');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Webhookサーバーが起動しました: http://localhost:${PORT}/webhook\n`);
    console.log('📝 次のステップ:');
    console.log('1. ngrok等でこのサーバーを外部公開してください');
    console.log('   例: ngrok http 3001');
    console.log('');
    console.log('2. LINE DevelopersコンソールでWebhook URLを設定:');
    console.log('   https://your-ngrok-url.ngrok.io/webhook');
    console.log('');
    console.log('3. Webhookを「有効」に設定');
    console.log('');
    console.log('4. LINE BOTに何かメッセージを送信してください');
    console.log('   （または BOTをグループに招待してメッセージ送信）');
    console.log('');
    console.log('5. ここにユーザーID/グループIDが表示されます！');
    console.log('===========================================\n');
});
