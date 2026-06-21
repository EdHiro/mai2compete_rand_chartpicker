class MermaidTool {
    static get toolbox() {
        return {
            title: 'Mermaid',
            icon: '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path fill="currentColor" d="M7 12h2v5H7v-5zm4-3h2v8h-2V9zm4-3h2v11h-2V6z"/></svg>'
        };
    }

    constructor({data, config, api}) {
        this.data = data;
        this.config = config || {};
        this.api = api;
        this.wrapper = undefined;
        this.textarea = undefined;
        this.preview = undefined;
    }

    static get sanitize() {
        return {
            content: true
        };
    }

    render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('mermaid-tool');

        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('mermaid-input');
        this.textarea.placeholder = '输入Mermaid图表代码';
        this.textarea.value = this.data && this.data.content ? this.data.content : '';

        this.preview = document.createElement('div');
        this.preview.classList.add('mermaid-preview');

        this.wrapper.appendChild(this.textarea);
        this.wrapper.appendChild(this.preview);

        this.textarea.addEventListener('input', this.updatePreview.bind(this));

        if (this.textarea.value) {
            this.updatePreview();
        }

        return this.wrapper;
    }

    async updatePreview() {
        const code = this.textarea.value;
        if (!code) {
            this.preview.innerHTML = '';
            return;
        }

        try {
            const id = 'mermaid-' + Date.now();
            this.preview.innerHTML = `<div class="mermaid" id="${id}">${code}</div>`;
            await mermaid.run();
        } catch (error) {
            console.error('Mermaid rendering error:', error);
            this.preview.innerHTML = `<div class="error">图表渲染错误: ${error.message}</div>`;
        }
    }

    save() {
        return {
            content: this.textarea.value
        };
    }

    static get isReadOnlySupported() {
        return true;
    }

    static get enableLineBreaks() {
        return true;
    }
}

// 添加样式
const style = document.createElement('style');
style.textContent = `
.mermaid-tool {
    margin-bottom: 15px;
}

.mermaid-input {
    width: 100%;
    min-height: 100px;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    resize: vertical;
}

.mermaid-preview {
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #f9f9f9;
}

.mermaid-preview .error {
    color: #ff4444;
    padding: 10px;
    background: #ffeeee;
    border-radius: 4px;
}
`;
document.head.appendChild(style);