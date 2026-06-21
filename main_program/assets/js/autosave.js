// 自动保存功能
class AutoSave {
    constructor(editor, options = {}) {
        this.editor = editor;
        this.options = {
            interval: options.interval || 30000, // 默认30秒保存一次
            savePath: options.savePath || '/post_edit.php',
            postId: options.postId || null
        };
        this.lastContent = null;
        this.timer = null;
        this.isDirty = false;

        // 绑定事件
        this.bindEvents();
        // 启动自动保存
        this.startAutoSave();
    }

    bindEvents() {
        // 监听编辑器变化
        this.editor.isReady.then(() => {
            this.editor.on('change', () => {
                this.isDirty = true;
            });
        });

        // 页面关闭前检查是否有未保存的内容
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '您有未保存的内容，确定要离开吗？';
            }
        });
    }

    startAutoSave() {
        this.timer = setInterval(() => {
            if (this.isDirty) {
                this.save();
            }
        }, this.options.interval);
    }

    stopAutoSave() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async save() {
        try {
            const content = await this.editor.save();
            
            // 如果内容没有变化，不需要保存
            if (this.lastContent && JSON.stringify(content) === JSON.stringify(this.lastContent)) {
                return;
            }

            const formData = new FormData();
            formData.append('action', 'autosave');
            formData.append('content', JSON.stringify(content));
            formData.append('is_draft', '1');
            
            if (this.options.postId) {
                formData.append('post_id', this.options.postId);
            }

            const response = await fetch(this.options.savePath, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.lastContent = content;
                this.isDirty = false;
                
                // 显示保存成功提示
                this.showNotification('草稿已自动保存', 'success');
            } else {
                throw new Error(result.message || '保存失败');
            }
        } catch (error) {
            console.error('自动保存失败:', error);
            this.showNotification('自动保存失败: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}