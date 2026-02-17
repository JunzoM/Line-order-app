const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // ← これを追加
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// セッション設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
cookie: {
    secure: true, // 常にtrueにする（RenderはHTTPSなのでOK）
    sameSite: 'none', // これを追加！他サイト扱いされるのを防ぎます
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
}
}));

app.use(express.static('frontend'));

// LINE Messaging APIの設定
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

// Supabaseクライアントの初期化
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ================== 認証ミドルウェア ==================

// ログイン必須ミドルウェア
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'ログインが必要です',
            redirectTo: '/login.html'
        });
    }
    next();
};

// 管理者権限必須ミドルウェア
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'ログインが必要です'
        });
    }
    if (req.session.userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            error: '管理者権限が必要です'
        });
    }
    next();
};

// ================== 認証API ==================

// ユーザー一覧取得（ログイン画面用）
app.get('/api/auth/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('username, full_name')
            .eq('is_active', true)
            .order('username');

        if (error) throw error;

        res.json({
            success: true,
            users: users.map(u => ({
                username: u.username,
                fullName: u.full_name
            }))
        });
    } catch (error) {
        console.error('ユーザー一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ユーザー一覧の取得に失敗しました'
        });
    }
});

// ログイン
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, remember } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'ユーザー名とパスワードを入力してください'
            });
        }

        // ユーザーを検索
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'ユーザー名またはパスワードが正しくありません'
            });
        }

        // パスワード検証
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'ユーザー名またはパスワードが正しくありません'
            });
        }

        // セッションに保存
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRole = user.role;
        req.session.fullName = user.full_name;

        // remember meの場合はクッキー期限を延長
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30日
        }

        // 最終ログイン時刻を更新
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({
            success: false,
            error: 'ログイン処理に失敗しました'
        });
    }
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'ログアウトに失敗しました'
            });
        }
        res.json({ success: true });
    });
});

// 現在のユーザー情報取得
app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'ログインしていません'
        });
    }

    res.json({
        success: true,
        user: {
            id: req.session.userId,
            username: req.session.username,
            fullName: req.session.fullName,
            role: req.session.userRole
        }
    });
});

// ユーザー登録（管理者のみ）
app.post('/api/auth/register', requireAdmin, async (req, res) => {
    try {
        const { username, email, password, fullName, role } = req.body;

        if (!username || !email || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: '必須項目が入力されていません'
            });
        }

        // パスワードハッシュ化
        const passwordHash = await bcrypt.hash(password, 10);

        // ユーザー作成
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email,
                    password_hash: passwordHash,
                    full_name: fullName,
                    role: role || 'user'
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { // unique violation
                return res.status(400).json({
                    success: false,
                    error: 'ユーザー名またはメールアドレスが既に使用されています'
                });
            }
            throw error;
        }

        res.json({
            success: true,
            message: 'ユーザーを登録しました',
            user: {
                id: data[0].id,
                username: data[0].username,
                email: data[0].email,
                fullName: data[0].full_name,
                role: data[0].role
            }
        });
    } catch (error) {
        console.error('ユーザー登録エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ユーザー登録に失敗しました'
        });
    }
});

// ================== 商品管理API（管理者のみ）==================

// 商品一覧取得（全ユーザー）
app.get('/api/products', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        res.json({
            success: true,
            products: data
        });
    } catch (error) {
        console.error('商品取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '商品の取得に失敗しました'
        });
    }
});

// 商品登録
app.post('/api/products', requireAdmin, async (req, res) => {
    try {
        const { name, default_unit, category, supplier, price, notes } = req.body;

        if (!name || !default_unit) {
            return res.status(400).json({
                success: false,
                error: '商品名と単位は必須です'
            });
        }

        const { data, error } = await supabase
            .from('products')
            .insert([
                {
                    name,
                    default_unit,
                    category: category || null,
                    supplier: supplier || null,
                    price: price || null,
                    notes: notes || null
                }
            ])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            product: data[0],
            message: '商品を登録しました'
        });
    } catch (error) {
        console.error('商品登録エラー:', error);
        res.status(500).json({
            success: false,
            error: '商品の登録に失敗しました'
        });
    }
});

// 商品更新
app.put('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, default_unit, category, supplier, price, notes, is_active } = req.body;

        const { data, error } = await supabase
            .from('products')
            .update({
                name,
                default_unit,
                category,
                supplier,
                price,
                notes,
                is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            product: data[0],
            message: '商品を更新しました'
        });
    } catch (error) {
        console.error('商品更新エラー:', error);
        res.status(500).json({
            success: false,
            error: '商品の更新に失敗しました'
        });
    }
});

// 商品削除（論理削除）
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '商品を削除しました'
        });
    } catch (error) {
        console.error('商品削除エラー:', error);
        res.status(500).json({
            success: false,
            error: '商品の削除に失敗しました'
        });
    }
});

// ================== 発注API ==================

// まとめて発注実行（複数商品を1枚のカードにまとめて送信）
app.post('/api/send-bulk-order', requireAuth, async (req, res) => {
    try {
        console.log('=== まとめて送信API開始 ===');
        console.log('受信データ:', JSON.stringify(req.body, null, 2));
        console.log('セッション情報:', {
            userId: req.session.userId,
            fullName: req.session.fullName
        });
        
        const { orders } = req.body;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            console.error('エラー: 発注データが不正');
            return res.status(400).json({
                success: false,
                error: '発注する商品がありません'
            });
        }

        console.log(`${orders.length}件の商品を処理開始`);

        // 日付をフォーマット（時刻なし）
        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

        // 各商品をデータベースに保存
        const savedOrders = [];
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            console.log(`商品 ${i + 1}/${orders.length}:`, order);
            
            const { productId, productName, quantity, unit, notes } = order;

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: req.session.userId,
                        product_id: productId || null,
                        product_name: productName,
                        quantity: parseFloat(quantity),
                        unit,
                        delivery_date: null,
                        order_notes: notes || null,
                        status: 'ordered',
                        line_sent: false
                    }
                ])
                .select();

            if (orderError) {
                console.error('データベース保存エラー:', orderError);
                throw orderError;
            }
            
            console.log(`商品 ${i + 1} 保存成功:`, orderData[0].id);
            savedOrders.push(orderData[0]);
        }

        console.log('全商品のDB保存完了');

        // 商品リストを作成（横並び形式 + 備考対応 + 区切り線）
        const productListContents = [];
        
        orders.forEach((order, index) => {
            // 2つ目以降の商品の前にセパレーターを追加
            if (index > 0) {
                productListContents.push({
                    type: 'separator',
                    margin: 'lg'
                });
            }

            const productBox = {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: `${order.productName}…`,
                                size: 'md',
                                color: '#333333',
                                wrap: true,
                                flex: 3,
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: order.quantity.toString(),
                                size: 'md',
                                color: '#e74c3c',
                                weight: 'bold',
                                align: 'end',
                                flex: 0
                            },
                            {
                                type: 'text',
                                text: ` ${order.unit}`,
                                size: 'md',
                                color: '#333333',
                                weight: 'bold',
                                flex: 0
                            }
                        ],
                        spacing: 'sm'
                    }
                ],
                margin: index === 0 ? 'none' : 'lg'
            };

            // 備考がある場合は追加
            if (order.notes) {
                productBox.contents.push({
                    type: 'text',
                    text: `備考: ${order.notes}`,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    margin: 'sm'
                });
            }

            productListContents.push(productBox);
        });

        console.log('LINEメッセージ作成完了');

        // 最初の商品の色を取得（デフォルトは紫）
        const headerColor = orders[0]?.headerColor || '#667eea';
        console.log('ヘッダー色:', headerColor);

        // 1枚のカードに全商品をまとめる
        const message = {
            type: 'flex',
            altText: `お疲れさまです🙇🏻‍♂️ ${orders.length}件の発注`,
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'お疲れさまです🙇🏻‍♂️',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff',
                            align: 'center'
                        },
                        {
                            type: 'text',
                            text: dateStr,
                            size: 'sm',
                            color: '#ffffff',
                            margin: 'md',
                            align: 'center'
                        }
                    ],
                    backgroundColor: headerColor,
                    paddingAll: 'lg'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: productListContents,
                    paddingAll: 'lg'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'separator',
                            margin: 'none'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '🛒',
                                    size: 'md',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: '上記発注お願い致します',
                                    size: 'sm',
                                    color: '#333333',
                                    weight: 'bold',
                                    margin: 'sm',
                                    flex: 0
                                }
                            ],
                            margin: 'md',
                            justifyContent: 'center'
                        },
                        {
                            type: 'text',
                            text: `発注者: ${req.session.fullName}`,
                            size: 'xxs',
                            color: '#aaaaaa',
                            align: 'center',
                            margin: 'md'
                        }
                    ],
                    paddingAll: 'md'
                }
            }
        };

        console.log('LINE送信開始...');

        // LINE Messaging APIにメッセージを送信
        try {
            await axios.post(
                'https://api.line.me/v2/bot/message/push',
                {
                    to: LINE_USER_ID,
                    messages: [message]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                    }
                }
            );

            console.log('LINE送信成功');

            // LINE送信成功フラグを更新
            for (const savedOrder of savedOrders) {
                await supabase
                    .from('orders')
                    .update({ line_sent: true })
                    .eq('id', savedOrder.id);
            }

            console.log('line_sentフラグ更新完了');
        } catch (lineError) {
            console.error('LINE送信エラー（発注は保存済み）:', lineError.response?.data || lineError.message);
            // LINE送信に失敗してもDBには保存済みなので、エラーにしない
        }

        console.log('=== まとめて送信API完了 ===');

        res.json({
            success: true,
            message: `${orders.length}件の発注をLINEに送信しました`,
            orders: savedOrders
        });

    } catch (error) {
        console.error('=== まとめて発注エラー ===');
        console.error('エラー詳細:', error);
        console.error('スタックトレース:', error.stack);
        res.status(500).json({
            success: false,
            error: 'まとめて発注の処理に失敗しました: ' + error.message
        });
    }
});

// 発注実行（データベース保存 + LINE送信）
app.post('/api/send-order', requireAuth, async (req, res) => {
    try {
        const { productId, productName, quantity, unit, notes, timestamp } = req.body;

        // バリデーション
        if (!productName || !quantity || !unit) {
            return res.status(400).json({
                success: false,
                error: '必須項目が入力されていません'
            });
        }

        // データベースに発注を保存
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    user_id: req.session.userId,
                    product_id: productId || null,
                    product_name: productName,
                    quantity: parseFloat(quantity),
                    unit,
                    delivery_date: null,
                    order_notes: notes || null,
                    status: 'ordered',
                    line_sent: false
                }
            ])
            .select();

        if (orderError) throw orderError;

        // 日付をフォーマット（時刻なし）
        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

        // LINEメッセージを作成（最終版デザイン）
        const message = {
            type: 'flex',
            altText: 'お疲れさまです🙇🏻‍♂️ 新規発注',
            contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'お疲れさまです🙇🏻‍♂️',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff'
                        },
                        {
                            type: 'text',
                            text: dateStr,
                            size: 'sm',
                            color: '#ffffff',
                            margin: 'md'
                        }
                    ],
                    backgroundColor: '#667eea',
                    paddingAll: 'lg'
                },
                body: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: `${productName}…`,
                            size: 'md',
                            weight: 'bold',
                            color: '#333333',
                            wrap: true,
                            flex: 3
                        },
                        {
                            type: 'text',
                            text: `${quantity} ${unit}`,
                            size: 'md',
                            weight: 'bold',
                            color: '#333333',
                            align: 'end',
                            flex: 1,
                            contents: [
                                {
                                    type: 'span',
                                    text: `${quantity}`,
                                    color: '#e74c3c',
                                    weight: 'bold'
                                },
                                {
                                    type: 'span',
                                    text: ` ${unit}`,
                                    color: '#333333',
                                    weight: 'bold'
                                }
                            ]
                        }
                    ],
                    paddingAll: 'lg',
                    spacing: 'md'
                },
                footer: notes ? {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'separator',
                            margin: 'none'
                        },
                        {
                            type: 'text',
                            text: notes,
                            size: 'xs',
                            color: '#666666',
                            wrap: true,
                            margin: 'md'
                        },
                        {
                            type: 'text',
                            text: `発注者: ${req.session.fullName}`,
                            size: 'xxs',
                            color: '#aaaaaa',
                            align: 'end',
                            margin: 'sm'
                        }
                    ],
                    paddingAll: 'md'
                } : {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'separator',
                            margin: 'none'
                        },
                        {
                            type: 'text',
                            text: `発注者: ${req.session.fullName}`,
                            size: 'xxs',
                            color: '#aaaaaa',
                            align: 'end',
                            margin: 'md'
                        }
                    ],
                    paddingAll: 'md'
                }
            }
        };

        // LINE Messaging APIにメッセージを送信
        try {
            await axios.post(
                'https://api.line.me/v2/bot/message/push',
                {
                    to: LINE_USER_ID,
                    messages: [message]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                    }
                }
            );

            // LINE送信成功フラグを更新
            await supabase
                .from('orders')
                .update({ line_sent: true })
                .eq('id', orderData[0].id);

            console.log('LINE送信成功');
        } catch (lineError) {
            console.error('LINE送信エラー（発注は保存済み）:', lineError.response?.data || lineError.message);
        }

        res.json({
            success: true,
            message: 'LINEに送信しました',
            orderId: orderData[0].id
        });

    } catch (error) {
        console.error('発注エラー:', error);
        res.status(500).json({
            success: false,
            error: '発注の処理に失敗しました',
            details: error.message
        });
    }
});

// ================== 発注履歴API ==================

// 発注履歴一覧取得
app.get('/api/orders', requireAuth, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('orders')
            .select('*')
            .order('ordered_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            orders: data
        });
    } catch (error) {
        console.error('発注履歴取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '発注履歴の取得に失敗しました'
        });
    }
});

// 発注詳細取得
app.get('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            order: data
        });
    } catch (error) {
        console.error('発注詳細取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '発注詳細の取得に失敗しました'
        });
    }
});

// 発注ステータス更新
app.put('/api/orders/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ordered', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: '無効なステータスです'
            });
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            order: data[0],
            message: 'ステータスを更新しました'
        });
    } catch (error) {
        console.error('ステータス更新エラー:', error);
        res.status(500).json({
            success: false,
            error: 'ステータスの更新に失敗しました'
        });
    }
});

// ================== 統計API ==================

// 統計情報取得
app.get('/api/statistics', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 期間内の発注件数
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        if (startDate) {
            query = query.gte('ordered_at', startDate);
        }
        if (endDate) {
            query = query.lte('ordered_at', endDate);
        }

        const { count: totalOrders, error: countError } = await query;

        if (countError) throw countError;

        // 商品別集計
        const { data: productStats, error: statsError } = await supabase
            .from('orders')
            .select('product_name, quantity, unit');

        if (statsError) throw statsError;

        // 商品別に集計
        const aggregated = {};
        productStats.forEach(order => {
            if (!aggregated[order.product_name]) {
                aggregated[order.product_name] = {
                    name: order.product_name,
                    totalQuantity: 0,
                    orderCount: 0
                };
            }
            aggregated[order.product_name].totalQuantity += parseFloat(order.quantity);
            aggregated[order.product_name].orderCount += 1;
        });

        res.json({
            success: true,
            statistics: {
                totalOrders,
                productStats: Object.values(aggregated)
                    .sort((a, b) => b.orderCount - a.orderCount)
                    .slice(0, 10) // トップ10
            }
        });
    } catch (error) {
        console.error('統計取得エラー:', error);
        res.status(500).json({
            success: false,
            error: '統計の取得に失敗しました'
        });
    }
});

// ヘルスチェック用エンドポイント
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: supabase ? 'connected' : 'not connected'
    });
});

app.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log('LINE Messaging API設定確認:');
    console.log('- Channel Access Token:', LINE_CHANNEL_ACCESS_TOKEN ? '設定済み' : '未設定');
    console.log('- User/Group ID:', LINE_USER_ID ? '設定済み' : '未設定');
    console.log('Supabase設定確認:');
    console.log('- Supabase URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
    console.log('- Supabase Key:', process.env.SUPABASE_ANON_KEY ? '設定済み' : '未設定');
});
