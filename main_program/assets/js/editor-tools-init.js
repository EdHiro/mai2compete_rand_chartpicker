/**
 * 编辑器工具初始化脚本
 * 用于在编辑器加载后初始化所有编辑工具
 */
document.addEventListener('DOMContentLoaded', function() {
    // 等待编辑器加载完成
    const editorReady = setInterval(() => {
        if (window.editor && window.editor.isReady) {
            clearInterval(editorReady);
            initEditorTools();
        }
    }, 100);

    function initEditorTools() {
        // 应用所有样式
        applyAllStyles();
        
        // 监听编辑器变化，重新应用样式
        window.editor.on('change', () => {
            setTimeout(applyAllStyles, 100);
        });

        // 监听主题变化，重新应用样式
        document.addEventListener('themeChanged', () => {
            setTimeout(applyAllStyles, 100);
        });
    }
    
    function applyAllStyles() {
        applyTextAlignment();
        applyFontSize();
        applyFontStyle();
        applyLineHeight();
        applyTextIndent();
        applyBackgroundColor();
    }

    function applyTextAlignment() {
        // 获取所有块
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            // 获取块的数据
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用文本对齐
                    if (blockData.tunes && blockData.tunes.alignment) {
                        const alignment = blockData.tunes.alignment.alignment;
                        block.classList.remove(
                            'ce-block--align-left',
                            'ce-block--align-center',
                            'ce-block--align-right'
                        );
                        block.classList.add(`ce-block--align-${alignment}`);
                    }
                }
            }).catch(err => console.error('Error applying alignment styles:', err));
        });
    }
    
    function applyFontSize() {
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用字体大小
                    if (blockData.tunes && blockData.tunes.fontSize) {
                        const fontSize = blockData.tunes.fontSize.fontSize;
                        block.classList.remove(
                            'ce-block--fontsize-small',
                            'ce-block--fontsize-normal',
                            'ce-block--fontsize-large',
                            'ce-block--fontsize-x-large',
                            'ce-block--fontsize-xx-large'
                        );
                        block.classList.add(`ce-block--fontsize-${fontSize}`);
                    }
                }
            }).catch(err => console.error('Error applying font size styles:', err));
        });
    }
    
    function applyFontStyle() {
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用字体样式
                    if (blockData.tunes && blockData.tunes.fontStyle) {
                        const fontStyle = blockData.tunes.fontStyle;
                        block.classList.remove(
                            'ce-block--fontstyle-bold',
                            'ce-block--fontstyle-italic',
                            'ce-block--fontstyle-underline',
                            'ce-block--fontstyle-bold-italic',
                            'ce-block--fontstyle-bold-underline',
                            'ce-block--fontstyle-italic-underline',
                            'ce-block--fontstyle-bold-italic-underline'
                        );
                        
                        const styleClasses = [];
                        if (fontStyle.bold) styleClasses.push('bold');
                        if (fontStyle.italic) styleClasses.push('italic');
                        if (fontStyle.underline) styleClasses.push('underline');
                        
                        if (styleClasses.length > 0) {
                            block.classList.add(`ce-block--fontstyle-${styleClasses.join('-')}`);
                        }
                    }
                }
            }).catch(err => console.error('Error applying font style styles:', err));
        });
    }
    
    function applyLineHeight() {
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用行间距
                    if (blockData.tunes && blockData.tunes.lineHeight) {
                        const lineHeight = blockData.tunes.lineHeight.lineHeight;
                        block.classList.remove(
                            'ce-block--lineheight-tight',
                            'ce-block--lineheight-normal',
                            'ce-block--lineheight-relaxed',
                            'ce-block--lineheight-loose'
                        );
                        block.classList.add(`ce-block--lineheight-${lineHeight}`);
                    }
                }
            }).catch(err => console.error('Error applying line height styles:', err));
        });
    }
    
    function applyTextIndent() {
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用文本缩进
                    if (blockData.tunes && blockData.tunes.textIndent) {
                        const indent = blockData.tunes.textIndent.indent;
                        block.classList.remove(
                            'ce-block--indent-none',
                            'ce-block--indent-small',
                            'ce-block--indent-medium',
                            'ce-block--indent-large'
                        );
                        block.classList.add(`ce-block--indent-${indent}`);
                    }
                }
            }).catch(err => console.error('Error applying text indent styles:', err));
        });
    }
    
    function applyBackgroundColor() {
        const blocks = document.querySelectorAll('.ce-block');
        
        blocks.forEach(block => {
            const blockIndex = Array.from(blocks).indexOf(block);
            window.editor.save().then(savedData => {
                if (savedData && savedData.blocks && savedData.blocks[blockIndex]) {
                    const blockData = savedData.blocks[blockIndex];
                    
                    // 应用文本颜色
                    if (blockData.tunes && blockData.tunes.color) {
                        const color = blockData.tunes.color.color;
                        const type = blockData.tunes.color.type || 'text';
                        
                        if (type === 'text') {
                            block.style.color = color;
                        }
                    }
                    
                    // 应用背景颜色
                    if (blockData.tunes && blockData.tunes.backgroundColor) {
                        const backgroundColor = blockData.tunes.backgroundColor.backgroundColor;
                        block.style.backgroundColor = backgroundColor;
                    }
                }
            }).catch(err => console.error('Error applying color styles:', err));
        });
    }
});