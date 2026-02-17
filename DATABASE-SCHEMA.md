# データベース設計書

## テーブル構成

### 1. users（ユーザー管理）
ログインユーザーの管理

| カラム名 | 型 | 説明 | 制約 |
|---------|-----|------|------|
| id | UUID | ユーザーID | PRIMARY KEY |
| username | VARCHAR(50) | ユーザー名 | NOT NULL UNIQUE |
| email | VARCHAR(200) | メールアドレス | NOT NULL UNIQUE |
| password_hash | VARCHAR(255) | パスワードハッシュ | NOT NULL |
| full_name | VARCHAR(100) | 氏名 | NOT NULL |
| role | VARCHAR(20) | 権限 | DEFAULT 'user' |
| is_active | BOOLEAN | 有効/無効 | DEFAULT true |
| created_at | TIMESTAMP | 作成日時 | DEFAULT NOW() |
| last_login | TIMESTAMP | 最終ログイン | NULL |

**権限（role）:**
- `admin` - 管理者（全機能利用可能）
- `user` - 一般ユーザー（発注のみ）

### 2. products（商品マスタ）
商品の基本情報を管理

| カラム名 | 型 | 説明 | 制約 |
|---------|-----|------|------|
| id | UUID | 商品ID | PRIMARY KEY |
| name | VARCHAR(200) | 商品名 | NOT NULL |
| default_unit | VARCHAR(50) | デフォルト単位 | NOT NULL |
| category | VARCHAR(100) | カテゴリ | NULL |
| supplier | VARCHAR(200) | 仕入先 | NULL |
| price | DECIMAL(10,2) | 単価 | NULL |
| notes | TEXT | 備考 | NULL |
| is_active | BOOLEAN | 有効/無効 | DEFAULT true |
| created_at | TIMESTAMP | 作成日時 | DEFAULT NOW() |
| updated_at | TIMESTAMP | 更新日時 | DEFAULT NOW() |

### 3. orders（発注履歴）
発注の記録を保存

| カラム名 | 型 | 説明 | 制約 |
|---------|-----|------|------|
| id | UUID | 発注ID | PRIMARY KEY |
| user_id | UUID | 発注者ID | FOREIGN KEY → users.id |
| product_id | UUID | 商品ID | FOREIGN KEY → products.id |
| product_name | VARCHAR(200) | 商品名（スナップショット） | NOT NULL |
| quantity | DECIMAL(10,2) | 数量 | NOT NULL |
| unit | VARCHAR(50) | 単位 | NOT NULL |
| delivery_date | DATE | 希望納期 | NULL |
| order_notes | TEXT | 発注時の備考 | NULL |
| status | VARCHAR(50) | ステータス | DEFAULT 'ordered' |
| ordered_at | TIMESTAMP | 発注日時 | DEFAULT NOW() |
| line_sent | BOOLEAN | LINE送信済み | DEFAULT false |

**ステータス:**
- `ordered` - 発注済み
- `confirmed` - 確認済み
- `shipped` - 発送済み
- `delivered` - 納品済み
- `cancelled` - キャンセル

### 3. categories（カテゴリマスタ）※オプション
商品カテゴリの管理

| カラム名 | 型 | 説明 | 制約 |
|---------|-----|------|------|
| id | UUID | カテゴリID | PRIMARY KEY |
| name | VARCHAR(100) | カテゴリ名 | NOT NULL UNIQUE |
| display_order | INTEGER | 表示順 | DEFAULT 0 |
| created_at | TIMESTAMP | 作成日時 | DEFAULT NOW() |

## ER図

```
┌─────────────┐
│ categories  │
│ (optional)  │
└──────┬──────┘
       │
       │ 1
       │
       │ N
┌──────┴──────┐         ┌─────────────┐
│  products   │ 1     N │   orders    │
│             │─────────│             │
│ - id        │         │ - id        │
│ - name      │         │ - product_id│
│ - unit      │         │ - quantity  │
│ - category  │         │ - status    │
└─────────────┘         └─────────────┘
```

## インデックス

### products
- `idx_products_name` ON name
- `idx_products_category` ON category
- `idx_products_is_active` ON is_active

### orders
- `idx_orders_product_id` ON product_id
- `idx_orders_status` ON status
- `idx_orders_delivery_date` ON delivery_date
- `idx_orders_ordered_at` ON ordered_at DESC

## データ例

### products
```sql
INSERT INTO products (name, default_unit, category, supplier, price) VALUES
('トマト', '箱', '野菜', '田中農園', 1500.00),
('レタス', '箱', '野菜', '山田青果', 800.00),
('牛乳', 'リットル', '乳製品', '鈴木牧場', 200.00);
```

### orders
```sql
INSERT INTO orders (product_id, product_name, quantity, unit, delivery_date, status) VALUES
('uuid-1', 'トマト', 10, '箱', '2026-02-15', 'ordered');
```

## Supabase セットアップSQL

```sql
-- 1. usersテーブル作成
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. productsテーブル作成
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    default_unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    supplier VARCHAR(200),
    price DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ordersテーブル作成
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    delivery_date DATE,
    order_notes TEXT,
    status VARCHAR(50) DEFAULT 'ordered',
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    line_sent BOOLEAN DEFAULT false
);

-- 4. セッションテーブル作成（express-session用）
CREATE TABLE session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_session_expire ON session(expire);

-- 5. インデックス作成
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 6. サンプルデータ投入

-- デフォルト管理者ユーザー（パスワード: admin123）
-- パスワードハッシュは bcrypt でハッシュ化されています
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@example.com', '$2a$10$rWzjGvPQvCZvW5LXHqKTn.vJLKYN5YqBxFqJLJZ8xQZGxqKqHvH8K', '管理者', 'admin');

-- 商品サンプル
INSERT INTO products (name, default_unit, category, supplier, price) VALUES
('トマト', '箱', '野菜', '田中農園', 1500.00),
('レタス', '箱', '野菜', '山田青果', 800.00),
('キュウリ', 'kg', '野菜', '田中農園', 300.00),
('牛乳', 'リットル', '乳製品', '鈴木牧場', 200.00),
('卵', 'パック', '乳製品', '佐藤養鶏', 250.00);

-- 5. RLS（Row Level Security）を有効化（本番環境で推奨）
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 6. 全ユーザーが読み書きできるポリシー（開発用・後で調整）
CREATE POLICY "Enable all access for products" ON products FOR ALL USING (true);
CREATE POLICY "Enable all access for orders" ON orders FOR ALL USING (true);
```

## 更新履歴の自動記録

```sql
-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
