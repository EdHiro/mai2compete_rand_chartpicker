class IframeTool {
    static get toolbox() {
        return {
            title: 'Iframe',
            icon: '<svg width="17" height="15" viewBox="0 0 17 15" xmlns="http://www.w3.org/2000/svg"><path d="M1 2.5C1 1.67157 1.67157 1 2.5 1H14.5C15.3284 1 16 1.67157 16 2.5V12.5C16 13.3284 15.3284 14 14.5 14H2.5C1.67157 14 1 13.3284 1 12.5V2.5Z" stroke="currentColor" fill="transparent"/><path d="M4 4L8 8L4 12" stroke="currentColor" fill="transparent"/><path d="M13 4L9 8L13 12" stroke="currentColor" fill="transparent"/></svg>'
        };
    }

    constructor({data, api}) {
        this.data = {
            url: data.url || '',
            width: data.width || '100%',
            height: data.height || '400',
            caption: data.caption || ''
        };
        this.api = api;
        this.wrapper = undefined;
    }

    render() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('iframe-tool');

        const input = document.createElement('input');
        input.placeholder = '输入URL';
        input.value = this.data.url;
        input.addEventListener('input', (event) => {
            this.data.url = event.target.value;
        });

        const widthInput = document.createElement('input');
        widthInput.placeholder = '宽度 (默认100%)';
        widthInput.value = this.data.width;
        widthInput.style.width = '150px';
        widthInput.addEventListener('input', (event) => {
            this.data.width = event.target.value;
        });

        const heightInput = document.createElement('input');
        heightInput.placeholder = '高度 (默认400px)';
        heightInput.value = this.data.height;
        heightInput.style.width = '150px';
        heightInput.addEventListener('input', (event) => {
            this.data.height = event.target.value;
        });

        const captionInput = document.createElement('input');
        captionInput.placeholder = '标题说明（可选）';
        captionInput.value = this.data.caption;
        captionInput.addEventListener('input', (event) => {
            this.data.caption = event.target.value;
        });

        const preview = document.createElement('div');
        preview.classList.add('iframe-preview');

        const updatePreview = () => {
            if (this.data.url) {
                preview.innerHTML = this._createIframe();
            } else {
                preview.innerHTML = '<p class="iframe-placeholder">在此处输入URL以预览iframe内容</p>';
            }
        };

        input.addEventListener('change', updatePreview);
        widthInput.addEventListener('change', updatePreview);
        heightInput.addEventListener('change', updatePreview);

        this.wrapper.appendChild(input);
        this.wrapper.appendChild(widthInput);
        this.wrapper.appendChild(heightInput);
        this.wrapper.appendChild(captionInput);
        this.wrapper.appendChild(preview);

        updatePreview();
        return this.wrapper;
    }

    _createIframe() {
        const iframe = `<iframe src="${this.data.url}" 
            width="${this.data.width}" 
            height="${this.data.height}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>`;
        return this.data.caption ? `${iframe}<div class="iframe-caption">${this.data.caption}</div>` : iframe;
    }

    save(blockContent) {
        return {
            url: this.data.url,
            width: this.data.width,
            height: this.data.height,
            caption: this.data.caption
        };
    }

    static get sanitize() {
        return {
            url: true,
            width: true,
            height: true,
            caption: true
        };
    }
}