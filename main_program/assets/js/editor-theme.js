// 编辑器主题和响应式布局支持
class EditorTheme {
    constructor(editor) {
        this.editor = editor;
        this.isDarkMode = false;
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 初始化主题
        this.initTheme();
        // 监听系统主题变化
        this.watchSystemTheme();
        // 初始化响应式布局
        this.initResponsiveLayout();
    }

    initTheme() {
        // 检查用户之前的主题设置
        const savedTheme = localStorage.getItem('editor-theme');
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        } else {
            // 跟随系统主题
            this.isDarkMode = this.mediaQuery.matches;
        }

        // 应用主题
        this.applyTheme();

        // 添加主题切换按钮
        this.addThemeToggle();
    }

    watchSystemTheme() {
        this.mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('editor-theme')) {
                this.isDarkMode = e.matches;
                this.applyTheme();
            }
        });
    }

    applyTheme() {
        const editorElement = document.getElementById('editorjs');
        const themeClass = this.isDarkMode ? 'dark-theme' : 'light-theme';
        
        // 更新编辑器主题类
        editorElement.classList.remove('dark-theme', 'light-theme');
        editorElement.classList.add(themeClass);

        // 保存主题设置
        localStorage.setItem('editor-theme', this.isDarkMode ? 'dark' : 'light');

        // 应用主题样式
        this.applyThemeStyles();
    }

    applyThemeStyles() {
        // 确保样式表存在
        let styleSheet = document.getElementById('editor-theme-styles');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'editor-theme-styles';
            document.head.appendChild(styleSheet);
        }

        // 定义主题样式
        const darkThemeStyles = `
            .dark-theme {
                background-color: #1a1a1a;
                color: #e0e0e0;
            }

            .dark-theme .ce-block__content,
            .dark-theme .ce-toolbar__content {
                background-color: #1a1a1a;
            }

            .dark-theme .ce-toolbar__plus,
            .dark-theme .ce-toolbar__settings-btn {
                color: #e0e0e0;
                background-color: #2d2d2d;
            }

            .dark-theme .ce-toolbar__plus:hover,
            .dark-theme .ce-toolbar__settings-btn:hover {
                background-color: #3d3d3d;
            }

            .dark-theme .cdx-block {
                color: #e0e0e0;
            }

            .dark-theme .ce-code__textarea {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #3d3d3d;
            }

            .dark-theme .language-select-container select,
            .dark-theme .language-select-container input {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #3d3d3d;
            }

            .dark-theme .ce-toolbar__actions {
                background-color: #2d2d2d;
            }

            .dark-theme .ce-popover {
                background-color: #2d2d2d;
                border-color: #3d3d3d;
            }

            .dark-theme .ce-popover__item-icon,
            .dark-theme .ce-popover__item-label {
                color: #e0e0e0;
            }

            .dark-theme .ce-popover__item:hover {
                background-color: #3d3d3d;
            }
        `;

        const lightThemeStyles = `
            .light-theme {
                background-color: #ffffff;
                color: #000000;
            }
        `;

        styleSheet.textContent = darkThemeStyles + lightThemeStyles;
    }

    addThemeToggle() {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'theme-toggle-btn fixed top-4 right-4 p-2 rounded-lg shadow-lg z-50';
        toggleButton.innerHTML = this.isDarkMode ? '☀️' : '🌙';
        
        toggleButton.addEventListener('click', () => {
            this.isDarkMode = !this.isDarkMode;
            toggleButton.innerHTML = this.isDarkMode ? '☀️' : '🌙';
            this.applyTheme();
        });

        document.body.appendChild(toggleButton);
    }

    initResponsiveLayout() {
        // 添加响应式样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @media (max-width: 768px) {
                .codex-editor {
                    padding: 0 15px;
                }

                .ce-toolbar__content {
                    max-width: calc(100% - 30px);
                }

                .ce-block__content {
                    max-width: calc(100% - 30px);
                }

                .ce-toolbar__actions {
                    right: 0;
                }

                .ce-popover {
                    right: 0;
                    left: 0;
                    margin: 0 15px;
                }

                .language-select-container {
                    flex-direction: column;
                }

                .language-select-container select,
                .language-select-container input {
                    width: 100%;
                    margin-bottom: 8px;
                }
            }
        `;

        document.head.appendChild(styleSheet);
    }
}