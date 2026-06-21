class TextAlignment {
    static get isInline() {
        return true;
    }

    static get title() {
        return '文本对齐';
    }

    get state() {
        return this._state;
    }

    set state(state) {
        this._state = state;
        this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
    }

    constructor({api}) {
        this.api = api;
        this.button = null;
        this._state = false;

        this.alignments = [
            {
                name: 'left',
                icon: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12v2H2V4zm0 3h8v2H2V7zm0 3h12v2H2v-2zm0 3h8v2H2v-2z"/></svg>',
                title: '左对齐'
            },
            {
                name: 'center',
                icon: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4h8v2H4V4zm-2 3h12v2H2V7zm2 3h8v2H4v-2zm-2 3h12v2H2v-2z"/></svg>',
                title: '居中对齐'
            },
            {
                name: 'right',
                icon: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12v2H2V4zm4 3h8v2H6V7zm-4 3h12v2H2v-2zm4 3h8v2H6v-2z"/></svg>',
                title: '右对齐'
            }
        ];

        this.currentAlignment = 'left';
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.classList.add('text-alignment-wrapper');

        this.alignments.forEach(alignment => {
            const button = document.createElement('button');
            button.classList.add('text-alignment-button');
            button.type = 'button';
            button.innerHTML = alignment.icon;
            button.title = alignment.title;
            button.dataset.alignment = alignment.name;

            button.addEventListener('click', () => {
                this.currentAlignment = alignment.name;
                this.apply(alignment.name);
            });

            wrapper.appendChild(button);
        });

        return wrapper;
    }

    surround(range) {
        if (!range) {
            return;
        }

        const selectedBlocks = this.getSelectedBlocks(range);

        selectedBlocks.forEach(block => {
            block.style.textAlign = this.currentAlignment;
        });
    }

    getSelectedBlocks(range) {
        const commonAncestor = range.commonAncestorContainer;
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        let blocks = [];

        if (commonAncestor.nodeType === Node.TEXT_NODE) {
            blocks.push(commonAncestor.parentElement);
        } else {
            const walker = document.createTreeWalker(
                commonAncestor,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );

            let node = walker.currentNode;

            while (node) {
                if (this.isBlock(node)) {
                    blocks.push(node);
                }
                node = walker.nextNode();
            }
        }

        return blocks;
    }

    isBlock(node) {
        const style = window.getComputedStyle(node);
        return style.display === 'block';
    }

    apply(alignment) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        this.surround(range);
    }

    checkState() {
        const selection = window.getSelection();
        if (!selection.anchorNode) {
            return;
        }

        const node = selection.anchorNode.parentElement;
        const computedStyle = window.getComputedStyle(node);
        this.currentAlignment = computedStyle.textAlign;
    }
}