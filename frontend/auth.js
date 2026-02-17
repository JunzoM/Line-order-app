// 認証チェック用の共通関数
const Auth = {
    currentUser: null,
    
    // ログイン状態をチェック
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.currentUser = result.user;
                    return result.user;
                }
            }
            
            // ログインしていない場合はログインページへリダイレクト
            window.location.href = '/login.html?message=unauthorized';
            return null;
        } catch (error) {
            console.error('認証チェックエラー:', error);
            window.location.href = '/login.html?message=unauthorized';
            return null;
        }
    },
    
    // 管理者権限をチェック
    async requireAdmin() {
        const user = await this.checkAuth();
        if (user && user.role !== 'admin') {
            alert('管理者権限が必要です');
            window.location.href = '/order.html';
            return false;
        }
        return true;
    },
    
    // ログアウト
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html?message=logout';
        } catch (error) {
            console.error('ログアウトエラー:', error);
            window.location.href = '/login.html';
        }
    },
    
    // ユーザー情報を表示
    displayUserInfo(containerId = 'userInfo') {
        if (!this.currentUser) return;
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #666; font-size: 14px;">
                    ${this.currentUser.fullName} 
                    ${this.currentUser.role === 'admin' ? '(管理者)' : ''}
                </span>
                <button onclick="Auth.logout()" style="
                    padding: 6px 12px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.3s;
                " onmouseover="this.style.background='#e0e0e0'" 
                   onmouseout="this.style.background='#f0f0f0'">
                    ログアウト
                </button>
            </div>
        `;
    }
};
