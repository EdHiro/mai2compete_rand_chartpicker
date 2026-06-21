class TextColor {
    static get isInline() {
        return true;
    }

    static get title() {
        return '文本颜色';
    }

    constructor({api}) {
        this.api = api;
        this.button = null;
        this._state = false;

        this.colors = [
            { name: 'black', value: '#000000', title: '黑色' },
            { name: 'red', value: '#FF0000', title: '红色' },
            { name: 'green', value: '#00FF00', title: '绿色' },
            { name: 'blue', value: '#0000FF', title: '蓝色' },
            { name: 'yellow', value: '#FFFF00', title: '黄色' }
        ];

        this.currentColor = this.colors[0].value;
        this.isBackground = false;
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.classList.add('text-color-wrapper');

        // 添加颜色选择器
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this.currentColor;
        colorPicker.classList.add('text-color-picker');
        colorPicker.addEventListener('change', (e) => {
            this.currentColor = e.target.value;
            this.apply();
        });

        // 添加切换按钮（文本色/背景色）
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.classList.add('text-color-toggle');
        toggleButton.innerHTML = this.isBackground ? 'BG' : 'T';
        toggleButton.addEventListener('click', () => {
            this.isBackground = !this.isBackground;
            toggleButton.innerHTML = this.isBackground ? 'BG' : 'T';
        });

        // 添加预设颜色按钮
        this.colors.forEach(color => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('text-color-preset');
            button.style.backgroundColor = color.value;
            button.title = color.title;
            button.addEventListener('click', () => {
                this.currentColor = color.value;
                colorPicker.value = color.value;
                this.apply();
            });
            wrapper.appendChild(button);
        });

        wrapper.appendChild(toggleButton);
        wrapper.appendChild(colorPicker);

        return wrapper;
    }

    surround(range) {
        if (!range) {
            return;
        }

        let selectedText = range.extractContents();
        let span = document.createElement('span');
        
        if (this.isBackground) {
            span.style.backgroundColor = this.currentColor;
        } else {
            span.style.color = this.currentColor;
        }

        span.appendChild(selectedText);
        range.insertNode(span);
    }

    checkState() {
        const selection = window.getSelection();
        if (!selection.anchorNode) {
            return;
        }

        const node = selection.anchorNode.parentElement;
        const computedStyle = window.getComputedStyle(node);
        
        if (this.isBackground) {
            this.currentColor = computedStyle.backgroundColor;
        } else {
            this.currentColor = computedStyle.color;
        }
    }

    apply() {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        this.surround(range);
    }
}