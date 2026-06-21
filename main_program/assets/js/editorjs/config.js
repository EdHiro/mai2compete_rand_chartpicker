// EditorJS 配置文件
const CustomCodeTool = {
    class: window.CodeTool,
    config: {
        placeholder: '输入代码',
        language: 'auto'
    }
};

const LatexTool = {
    class: window.EditorJSLatex?.LatexTool,
    config: {
        katexOptions: {
            throwOnError: false,
            displayMode: true
        }
    }
};

const editorConfig = {
    holder: 'editorjs',
    autofocus: true,
    placeholder: '开始写作...',
    tools: {
        header: {
            class: Header,
            inlineToolbar: true,
            config: {
                levels: [1, 2, 3, 4, 5, 6],
                defaultLevel: 3
            }
        },
        paragraph: {
            inlineToolbar: true
        },
        list: {
            class: List,
            inlineToolbar: true
        },
        code: CustomCodeTool,
        image: {
            class: ImageTool,
            config: {
                endpoints: {
                    byFile: 'upload.php'
                },
                uploader: {
                    uploadByFile(file) {
                        const formData = new FormData();
                        formData.append('image', file);

                        return fetch('upload.php', {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => response.json())
                        .then(result => {
                            return {
                                success: 1,
                                file: {
                                    url: result.url
                                }
                            };
                        });
                    }
                }
            }
        },
        quote: {
            class: Quote,
            inlineToolbar: true
        },
        marker: {
            class: Marker,
            shortcut: 'CMD+SHIFT+M'
        },
        underline: Underline,
        table: {
            class: Table,
            inlineToolbar: true
        },
        warning: Warning,
        delimiter: Delimiter,
        embed: {
            class: Embed,
            config: {
                services: {
                    youtube: true,
                    bilibili: {
                        regex: /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/([^\s&]+)/,
                        embedUrl: 'https://player.bilibili.com/player.html?bvid=<%= remote_id %>',
                        html: '<iframe width="100%" height="480" src="<%= embed %>" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
                    }
                }
            }
        },
        latex: LatexTool,
        mermaid: MermaidTool,
        checklist: {
            class: Checklist,
            inlineToolbar: true
        },
        textAlignment: {
            class: TextAlignment,
            inlineToolbar: true
        },
        textColor: {
            class: TextColor,
            inlineToolbar: true
        },
        iframe: {
            class: IframeTool
        },
        attaches: {
            class: AttachesTool,
            config: {
                endpoint: 'upload.php',
                uploader: {
                    uploadByFile(file) {
                        const formData = new FormData();
                        formData.append('file', file);

                        return fetch('upload.php', {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => response.json())
                        .then(result => {
                            return {
                                success: 1,
                                file: {
                                    url: result.url,
                                    size: result.size,
                                    name: result.name,
                                    extension: result.extension
                                }
                            };
                        });
                    }
                }
            }
        }
    },
    i18n: {
        messages: {
            ui: {
                "blockTunes": {
                    "toggler": {
                        "Click to tune": "点击配置",
                        "or drag to move": "或拖动移动"
                    }
                },
                "toolbar": {
                    "toolbox": {
                        "Add": "添加块"
                    }
                }
            },
            toolNames: {
                "Text": "文本",
                "Heading": "标题",
                "List": "列表",
                "Quote": "引用",
                "Code": "代码",
                "Image": "图片",
                "Table": "表格",
                "Warning": "警告",
                "Delimiter": "分隔符",
                "Raw HTML": "HTML",
                "Link": "链接",
                "Marker": "标记",
                "Bold": "粗体",
                "Italic": "斜体",
                "InlineCode": "行内代码"
            },
            tools: {
                "warning": {
                    "Title": "标题",
                    "Message": "内容"
                },
                "link": {
                    "Add a link": "添加链接"
                },
                "image": {
                    "Select an Image": "选择图片",
                    "Caption": "图片说明",
                    "Select an image": "选择图片",
                    "With border": "显示边框",
                    "Stretch image": "拉伸图片",
                    "With background": "显示背景"
                }
            }
        }
    }
};